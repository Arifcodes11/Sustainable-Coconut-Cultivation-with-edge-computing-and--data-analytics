import os
import json
import cv2
import numpy as np
from flask import Flask, request, jsonify
from tensorflow.keras.models import load_model
from PIL import Image
from flask_cors import CORS
from werkzeug.utils import secure_filename
from ultralytics import YOLO, solutions
import time
from threading import Event
import atexit

app = Flask(__name__)
CORS(app)  # Enable CORS

# Global variables to store the model and class labels
current_model = None
class_labels = []

MODEL_PATH = 'Trained_models_coco_disease.h5'
LABELS_PATH = 'Trained_models_coco_disease.json'

# Initialize variables for coconut detection
counts = {"mature": {"IN": 0, "OUT": 0}, 
          "premature": {"IN": 0, "OUT": 0}, 
          "overly_mature": {"IN": 0, "OUT": 0}}
process_active = False
counter_thread = None
stop_event = Event()
cap = None  # Global camera capture object

# Load YOLOv8 model
model = YOLO('./newb.engine', task='detect')

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'mp4', 'avi', 'mov'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Load the model and labels

def load_model_and_labels():
    global current_model, class_labels
    # Load the model
    current_model = load_model(MODEL_PATH)

    # Load the labels from the JSON file
    try:
        with open(LABELS_PATH, 'r') as file:
            class_labels = json.load(file)
    except FileNotFoundError:
        raise FileNotFoundError("No class labels file found at {}.".format(LABELS_PATH))

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
    region_points = [(w//2-100, 1), (w//2+100, 1),(w//2+100, h-1), (w//2-100, h-1)]
    
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
            total_counts[class_name]['OUT'] = counts['OUT']
    
    cap.release()
    cnts = {
        'Mature': total_counts['Mature']['IN'] + total_counts['Mature']['OUT'],
        'Premature': total_counts['Premature']['IN'] + total_counts['Premature']['OUT'],
        'Potential': total_counts['Potential']['IN'] + total_counts['Potential']['OUT']
    }
    return {'success': True, 'counts': cnts, 'type': 'video'}

# Preprocess frame for disease model
def preprocess_frame(image):
    image = image.resize((224, 224))  # Match the model's expected input size
    image_array = np.array(image) / 255.0  # Normalize the image
    return np.expand_dims(image_array, axis=0)  # Add batch dimension

# Handle disease detection
@app.route('/disease', methods=['POST'])
def handle_request():
    global current_model, class_labels

    if 'image' in request.files:
        if current_model is None:
            return jsonify({"error": "No model is currently loaded. Please load a model first."}), 400

        file = request.files['image']
        try:
            # Read and preprocess the image
            image = Image.open(file.stream)
            input_frame = preprocess_frame(image)

            # Perform inference
            predictions = current_model.predict(input_frame)[0]
            predicted_class = np.argmax(predictions)
            confidence = predictions[predicted_class]

            return jsonify({
                "predicted_class": class_labels[predicted_class],
                "confidence": float(confidence)
            })
        except Exception as e:
            return jsonify({"error": "Error processing image: {}".format(str(e))}), 500

    else:
        return jsonify({"error": "Invalid request. Provide an image."}), 400

# Cleanup function to release the camera
def cleanup():
    global cap
    if cap is not None:
        cap.release()
        cap = None
    print("Camera released.")

# Register the cleanup function to be called on exit
atexit.register(cleanup)

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
    try:
        load_model_and_labels()
        print("Model and labels loaded successfully.")
        app.run(debug=True, use_reloader=False, host='0.0.0.0', port=5033)
    except Exception as e:
        print("Error loading model or labels: {}".format(str(e)))


