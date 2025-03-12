from tensorflow.saved_model import load

def load_model_and_labels():
    global current_model, class_labels
    # Load the SavedModel format
    current_model = load(MODEL_PATH)

    # Load labels
    try:
        with open(LABELS_PATH, 'r') as file:
            class_labels = json.load(file)
    except FileNotFoundError:
        raise FileNotFoundError(f"No class labels file found at {LABELS_PATH}.")


