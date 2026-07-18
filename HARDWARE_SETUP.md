# Hardware Degradation — Setup Guide

This covers wiring the physical rack monitor, enabling Firebase, training/running the
MLP classifier, and how the dashboard's simulated fallback works. See the original
implementation plan for architecture context.

## 1. Enable Firebase Realtime Database

The provided Firebase config (`src/firebase.js`) only had Analytics set up — Realtime
Database needs to be created separately:

1. Open the [Firebase Console](https://console.firebase.google.com/) → project `john-fish`.
2. Build → Realtime Database → **Create Database** (choose a region close to you).
3. Start in **locked mode**, then replace the rules with [firebase.rules.json](firebase.rules.json)
   (Realtime Database → Rules tab → paste → Publish). These rules allow public read
   (so the dashboard can show live data with no login) and deny public write (only the
   ESP32/Python service can write, using the legacy database secret, which bypasses
   rules entirely).
4. Copy the **exact** database URL shown at the top of the Data tab and paste it into
   `databaseURL` in [src/firebase.js](src/firebase.js) — it's currently a best-guess
   placeholder (`https://john-fish-default-rtdb.firebaseio.com`) marked `TODO verify`.
5. Get the legacy database secret: Project Settings (gear icon) → Service Accounts →
   Database Secrets. You'll need this for both the ESP32 firmware and the Python
   classifier service.

## 2. Wire the rack monitor

| Component | ESP32 pin | Notes |
|---|---|---|
| DHT11 data | GPIO 4 | Ambient temp/humidity |
| Thermistor (NTC, voltage divider w/ 10k series resistor) | GPIO 34 (ADC) | Tape to CPU heatsink |
| Tilt switch / door sensor | GPIO 27 | `INPUT_PULLUP`, wired to GND when open (adjust firmware if your switch is reversed) |
| Water/leak sensor | GPIO 35 (ADC) | |
| Green LED | GPIO 25 | Normal |
| Red LED | GPIO 26 | AI warning/critical |
| Active buzzer | GPIO 33 | Tamper/water alarm |

## 3. Flash the firmware

1. Open `firmware/HardwareMonitor/HardwareMonitor.ino` in the Arduino IDE (board:
   "ESP32 Dev Module").
2. Install libraries: **DHT sensor library** (Adafruit), **Adafruit Unified Sensor**,
   **ArduinoJson**.
3. Copy `firmware/HardwareMonitor/secrets.h.example` → `secrets.h` in the same folder,
   fill in your WiFi SSID/password, the `databaseURL` from step 1, and the database
   secret. `secrets.h` is gitignored — never commit real credentials.
4. Upload. Open Serial Monitor (115200 baud) to confirm WiFi connects and telemetry
   pushes succeed.

The firmware drives LEDs/buzzer from **local thresholds immediately** (no cloud
round-trip needed for safety), and separately polls `/prediction/state` to also light
the red LED when the AI classifier (not just the hardcoded thresholds) calls a
Degrading/Critical state.

## 4. Train and run the ML classifier

No real rack history exists yet, so `train_mlp.py` bootstraps on rule-labeled synthetic
data (thresholds mirrored from the firmware). Swap in real exported telemetry once
you've collected some.

```bash
cd ml
pip install -r requirements.txt
python train_mlp.py                 # produces model.pkl, prints a classification report
FIREBASE_DATABASE_URL=https://<your-db>.firebaseio.com \
FIREBASE_DATABASE_SECRET=<your-secret> \
python classifier_service.py        # polls telemetry every 5s, writes /prediction back
```

## 5. Frontend behavior (no setup needed)

[src/components/HardwareDegradation.jsx](src/components/HardwareDegradation.jsx) subscribes
to `racks/rack-01` over the Firebase JS SDK. If no data arrives within 4 seconds (wrong
URL, database not created yet, no device powered on), it automatically falls back to a
client-side simulated telemetry generator — so the page is always demoable, and
switches to "LIVE" automatically the moment real data starts flowing in.

## Data schema

```
racks/rack-01/
  telemetry/{pushId}: { ts, ambientTemp, ambientHumidity, componentTemp, doorOpen, waterDetected }
  events/{pushId}:    { ts, type: "tamper"|"water"|"thermal"|"info", message }
  prediction:         { state: "Normal"|"Degrading"|"Critical", confidence, updatedAt }
```
