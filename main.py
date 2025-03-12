import os
import cv2
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, db
from werkzeug.utils import secure_filename
from ultralytics import YOLO, solutions
import time
from threading import Event
import atexit

# Initialize Flask
app = Flask(__name__)
CORS(app)  # Enable CORS

# Firebase configuration (replace with your credentials)
cred = credentials.Certificate('./coco-d4645-firebase-adminsdk-zgctd-276450b910.json')
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://coco-d4645-default-rtdb.asia-southeast1.firebasedatabase.app'
})

# Firebase database reference
ref = db.reference()

# Global variables
counts = {"mature": {"IN": 0, "OUT": 0}, 
          "premature": {"IN": 0, "OUT": 0}, 
          "overly_mature": {"IN": 0, "OUT": 0}}
process_active = False
counter_thread = None
stop_event = Event()
cap = None  # Global camera capture object

# Load YOLOv8 model
model = YOLO('./newb.engine',task='detect')

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'mp4', 'avi', 'mov'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def reset_counts():
    global counts
    counts = {"mature": {"IN": 0, "OUT": 0}, 
              "premature": {"IN": 0, "OUT": 0}, 
              "overly_mature": {"IN": 0, "OUT": 0}}
    ref.child("coconut_count").set(counts)

# Firebase update function
def update_firebase_counts(classwise_counts):
    try:
        print(f"Classwise counts: {classwise_counts}")  # Debugging information
        firebase_counts = {
            "mature": {"IN": classwise_counts.get('Mature', {}).get('IN', 0), "OUT": classwise_counts.get('Mature', {}).get('OUT', 0)},
            "premature": {"IN": classwise_counts.get('Premature', {}).get('IN', 0), "OUT": classwise_counts.get('Premature', {}).get('OUT', 0)},
            "overly_mature": {"IN": classwise_counts.get('Overly Mature', {}).get('IN', 0), "OUT": classwise_counts.get('Overly Mature', {}).get('OUT', 0)}
        }
        ref.child("coconut_count").set(firebase_counts)
        print("Firebase updated successfully.")
    except Exception as e:
        print(f"Error updating Firebase: {e}")

# Object counting function
def count_specific_classes(model_path, classes_to_count):
    global process_active, stop_event, cap
    try:
        if cap is None:
            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                raise RuntimeError("Failed to open camera")

        line_points = [(20, 20), (20, 400)]
        counter = solutions.ObjectCounter(show=True, region=line_points, model=model_path, classes=classes_to_count)

        while cap.isOpened() and process_active and not stop_event.is_set():
            success, im0 = cap.read()
            if not success:
                break

            im0 = counter.count(im0)

            update_thread = threading.Thread(target=update_firebase_counts, args=(counter.classwise_counts,))
            update_thread.start()

            cv2.imshow("Object Counting", im0)
            if cv2.waitKey(1) & 0xFF == ord('q') or stop_event.is_set():
                break

    except Exception as e:
        print(f"Error in counting process: {e}")
    finally:
        cv2.destroyAllWindows()
        process_active = False

# Detect coconuts function
def detect_coconuts(image_path):
    results = model(image_path, conf=0.5)[0]  # Get first image results
    object_counts = {'Mature': 0, 'Premature': 0, 'Potential': 0}
    
    for result in results.boxes.data:
        conf = float(result[4])
        class_id = int(result[5])
        class_name = model.names[class_id]
        print(class_name, conf)
        if conf > 0.5:
            if class_name in object_counts:
                object_counts[class_name] += 1
    
    return {'success': True, 'counts': object_counts}

# Process video function
def process_video(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {'error': 'Failed to open video'}
    
    # Get video properties
    w, h, fps = (int(cap.get(x)) for x in (cv2.CAP_PROP_FRAME_WIDTH, cv2.CAP_PROP_FRAME_HEIGHT, cv2.CAP_PROP_FPS))
    
    # Define counting region
    # line_points = [(200, 2), (w-200, h-2)]
    region_points = [(w//2-100, 1), (w//2+100, 1),(w//2+100, h-1), (w//2-100, h-1)]
    # region_points = [(1, 1), (101, 1),(w-1, h-1), (w-100, h-1)]
    
    # Initialize object counter
    counter = solutions.ObjectCounter(show=False, region=region_points, model='./newb.engine', classes=[0, 1, 2])
    
    # Track total counts for each class
    total_counts = {"Mature": {"IN": 0, "OUT": 0}, "Premature": {"IN": 0, "OUT": 0}, "Potential": {"IN": 0, "OUT": 0}}
    
    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break
        
        # Process frame with object counter
        frame = counter.count(frame)
        
        # Update total counts
    for class_name, counts in counter.classwise_counts.items():
           
        total_counts[class_name]['IN'] = counts['IN']
        total_counts[class_name]['OUT']= counts['OUT']
    
    cap.release()
    cnts={
        'Mature':total_counts['Mature']['IN']+total_counts['Mature']['OUT'],
        'Premature':total_counts['Premature']['IN']+total_counts['Premature']['OUT'],
        'Potential':total_counts['Potential']['IN']+total_counts['Potential']['OUT']    }
    return {'success': True, 'counts': cnts, 'type': 'video'}

# Start counting process
def start_coconut_counting():
    global counter_thread, process_active, stop_event
    if not process_active:
        reset_counts()
        process_active = True
        stop_event.clear()
        counter_thread = threading.Thread(target=lambda: count_specific_classes(
            './best.pt', [0, 1, 2]
        ))
        counter_thread.start()
        print("Counting process started.")

# Stop counting process
def stop_coconut_counting():
    global process_active, stop_event
    process_active = False
    stop_event.set()
    time.sleep(1)  # Ensure cleanup
    print("Counting process stopped.")

# Cleanup function to release the camera
def cleanup():
    global cap
    if cap is not None:
        cap.release()
        cap = None
    print("Camera released.")

# Register the cleanup function to be called on exit
atexit.register(cleanup)

# Firebase listener
def switch_listener(event):
    try:
        switch_value = event.data
        if isinstance(switch_value, str):
            switch_value = switch_value.lower() == "true"

        if switch_value:
            start_coconut_counting()
        else:
            stop_coconut_counting()
    except Exception as e:
        print(f"Error in switch listener: {e}")
        stop_coconut_counting()  # Emergency stop

# Add listener to Firebase switch
switch_ref = ref.child('switch')
switch_ref.listen(switch_listener)

@app.route('/')
def home():
    return "Flask app is running!"

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Process file
        try:
            if filename.rsplit('.', 1)[1].lower() in {'mp4', 'avi', 'mov'}:
                result = process_video(filepath)
            else:
                result = detect_coconuts(filepath)
            return jsonify(result)
        finally:
            os.remove(filepath)

    return jsonify({'error': 'Invalid file type'}), 400

if __name__ == '__main__':
    app.run(debug=True, use_reloader=False, host='0.0.0.0', port=5033)

