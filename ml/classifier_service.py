"""
Polls Firebase Realtime Database for the latest rack telemetry, classifies
Normal/Degrading/Critical with the trained MLP (model.pkl), and writes the
prediction back so the ESP32 firmware and the HardwareDegradation.jsx
dashboard page both pick it up.

Usage:
    pip install -r requirements.txt
    python train_mlp.py                  # produces model.pkl (once)
    FIREBASE_DATABASE_URL=https://john-fish-default-rtdb.firebaseio.com \
    FIREBASE_DATABASE_SECRET=your-secret \
    python classifier_service.py
"""

import os
import time
import joblib
import numpy as np
import requests

RACK_ID = os.environ.get("RACK_ID", "rack-01")
POLL_INTERVAL_SECONDS = float(os.environ.get("POLL_INTERVAL_SECONDS", "5"))
DATABASE_URL = os.environ["FIREBASE_DATABASE_URL"].rstrip("/")
DATABASE_SECRET = os.environ["FIREBASE_DATABASE_SECRET"]

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")


def rtdb_get(path, params=None):
    params = dict(params or {})
    params["auth"] = DATABASE_SECRET
    resp = requests.get(f"{DATABASE_URL}/{path}.json", params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()


def rtdb_put(path, body):
    resp = requests.put(f"{DATABASE_URL}/{path}.json", params={"auth": DATABASE_SECRET}, json=body, timeout=10)
    resp.raise_for_status()
    return resp.json()


def load_model():
    bundle = joblib.load(MODEL_PATH)
    return bundle["model"], bundle["scaler"], bundle["feature_names"], bundle["labels"]


def latest_two_readings():
    raw = rtdb_get(f"racks/{RACK_ID}/telemetry", params={"orderBy": '"$key"', "limitToLast": 2})
    if not raw:
        return []
    # RTDB returns {pushId: {...}}; sort by push id which is chronologically ordered.
    return [v for _, v in sorted(raw.items())]


def build_features(readings, feature_names):
    latest = readings[-1]
    prev = readings[-2] if len(readings) > 1 else latest
    delta = latest["componentTemp"] - prev["componentTemp"]

    row = {
        "ambientTemp": latest["ambientTemp"],
        "ambientHumidity": latest["ambientHumidity"],
        "componentTemp": latest["componentTemp"],
        "componentTempDelta": delta,
        "doorOpen": int(bool(latest.get("doorOpen"))),
        "waterDetected": int(bool(latest.get("waterDetected"))),
    }
    return np.array([[row[name] for name in feature_names]]), latest


def classify_once(model, scaler, feature_names, labels):
    readings = latest_two_readings()
    if not readings:
        print("No telemetry yet, skipping.")
        return

    X, latest = build_features(readings, feature_names)
    X_scaled = scaler.transform(X)
    proba = model.predict_proba(X_scaled)[0]
    predicted_idx = int(np.argmax(proba))
    state = model.classes_[predicted_idx]
    confidence = float(proba[predicted_idx])

    print(f"componentTemp={latest['componentTemp']:.1f}C -> {state} ({confidence:.0%})")
    rtdb_put(f"racks/{RACK_ID}/prediction", {
        "state": state,
        "confidence": round(confidence, 3),
        "updatedAt": int(time.time() * 1000),
    })


def main():
    model, scaler, feature_names, labels = load_model()
    print(f"Loaded model. Polling {DATABASE_URL}/racks/{RACK_ID} every {POLL_INTERVAL_SECONDS}s")
    while True:
        try:
            classify_once(model, scaler, feature_names, labels)
        except requests.RequestException as exc:
            print(f"RTDB request failed: {exc}")
        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
