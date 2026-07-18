"""
Train an MLP classifier for server rack hardware degradation state.

Bootstraps on synthetic telemetry (rule-labeled) since no real rack history
exists yet. Once classifier_service.py has been running against a real rack
for a while, export its logged telemetry+labels and swap the synthetic
generator below for that real dataset -- the training/eval code stays the same.

Usage:
    pip install -r requirements.txt
    python train_mlp.py
"""

import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix

FEATURE_NAMES = ["ambientTemp", "ambientHumidity", "componentTemp", "componentTempDelta", "doorOpen", "waterDetected"]
LABELS = ["Normal", "Degrading", "Critical"]

# Mirrors the ESP32 firmware's fast local thresholds -- keep these three
# label rules in sync with TEMP_DEGRADING_C / TEMP_CRITICAL_C in
# firmware/HardwareMonitor/HardwareMonitor.ino
def label_row(component_temp, component_delta, door_open, water_detected):
    if water_detected or component_temp >= 85 or (component_temp >= 75 and component_delta >= 5):
        return "Critical"
    if door_open or component_temp >= 65 or component_delta >= 3:
        return "Degrading"
    return "Normal"


def generate_synthetic_dataset(n_samples=6000, seed=42):
    rng = np.random.default_rng(seed)
    rows = []
    labels = []

    for _ in range(n_samples):
        ambient_temp = rng.normal(25, 3)
        ambient_humidity = np.clip(rng.normal(50, 10), 10, 95)

        # Mix of steady-state and thermal-creep scenarios so the classifier
        # sees enough Degrading/Critical examples despite them being rare events.
        scenario = rng.random()
        if scenario < 0.7:
            component_temp = np.clip(rng.normal(40, 6), 25, 95)
            component_delta = rng.normal(0, 1)
        elif scenario < 0.9:
            component_temp = np.clip(rng.normal(70, 8), 50, 95)
            component_delta = rng.normal(2, 1.5)
        else:
            component_temp = np.clip(rng.normal(88, 6), 70, 100)
            component_delta = rng.normal(5, 2)

        door_open = int(rng.random() < 0.05)
        water_detected = int(rng.random() < 0.02)

        rows.append([ambient_temp, ambient_humidity, component_temp, component_delta, door_open, water_detected])
        labels.append(label_row(component_temp, component_delta, door_open, water_detected))

    return np.array(rows), np.array(labels)


def main():
    X, y = generate_synthetic_dataset()
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

    scaler = StandardScaler().fit(X_train)
    X_train_scaled = scaler.transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = MLPClassifier(hidden_layer_sizes=(16, 8), activation="relu", max_iter=500, random_state=42)
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    print("Classification report:")
    print(classification_report(y_test, y_pred, labels=LABELS))
    print("Confusion matrix (rows=true, cols=pred), order:", LABELS)
    print(confusion_matrix(y_test, y_pred, labels=LABELS))

    joblib.dump({"model": model, "scaler": scaler, "feature_names": FEATURE_NAMES, "labels": LABELS}, "model.pkl")
    print("\nSaved model.pkl")


if __name__ == "__main__":
    main()
