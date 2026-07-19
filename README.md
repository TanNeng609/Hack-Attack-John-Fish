# AegisAI (Ægis-AI) — Cross-Domain Operational & Financial Anomaly Shield

AegisAI is a proactive command center designed for modern enterprises. It integrates physical server room telemetry, microservices infrastructure performance, and real-time transaction monitoring into a unified visual dashboard. The system correlates operational failures (like database locks or memory leaks) with down-stream business outcomes (like checkout API failure rates and estimated revenue loss in MYR) to recommend and execute automated, explainable AI (XAI) remediations.

Developed by team **John Fish** for the Hack Attack 3.0 Case Study 1: *AI-Driven IT Incident Prediction & Financial Risk Detection*.

---

## 🚀 Key Features

* **Overview (Command Center):** Correlates live CPU load profiles against transaction failure rates on a dual-axis time-series visualization. Tracks cumulative business value saved via downtime avoidance in Malaysian Ringgit (MYR).
* **IT Incident Prediction:** Interactive microservices topology map showing nodes (API Gateway, User Service, DB Cluster, Payment Gateway) compared live against historical baselines.
* **Fault Injection Sandbox:** Drops down custom faults directly into the predictive engine:
  * *Traffic Spikes (Thread Exhaustion)*
  * *Database Deadlocks*
  * *JVM Memory Leaks*
* **Explainable AI (XAI):** Surfaces deep learning classification metrics (PyTorch LSTM Sequence Classifiers, GNN Query Contention Dependency Maps, and Autoencoder Reconstruction vectors) to explain the root causes of anomalies.
* **Financial Risk Auditor:** Ingests live transactional event streams, highlighting anomalies (e.g., geolocational logons, transfer velocity spikes) evaluated against ensemble fraud nets.
* **Hardware Degradation Monitor:** Captures physical server rack telemetry (temperatures, tilt door tampers, moisture leaks) streamed live from physical ESP32 boards using Firebase Realtime Database.
* **Automated Remediation Console:** AI-suggested repair scripts (e.g., autoscaling, killing deadlocks, rolling restarts) that execute step-by-step inside an interactive dashboard shell simulator.

---

## 📐 Architecture Diagram

```
+-----------------------------------+
|       ESP32 IoT Rack Monitor      |
| (DHT11, Thermistor, Tilt, Water)  |
+---------------------------------+-+
                                  | (Live telemetry updates)
                                  v
+-----------------------------------+
|     Firebase Realtime Database    | <----+
|     racks/rack-01/telemetry       |      |
+---------------------------------+-+      | (Pushes AI predictions)
                                  |        |
         (Polls raw telemetry)    v        |
+-----------------------------------+      |
|    ML/Classifier Python Daemon    | +----+
|  (Scikit-Learn MLP model.pkl)     |
+-----------------------------------+

+-----------------------------------+
|          React Frontend           |
| (Vite, Chart.js, Firebase SDK)    | <--- Ingests RTDB & IT Telemetry
+-----------------------------------+
```

---

## 🛠️ Tech Stack

* **Frontend:** React (JSX), Chart.js (v4), FontAwesome, Vanilla CSS.
* **Database & Ingestion:** Firebase Realtime Database (JS SDK / REST API).
* **IoT Firmware:** C++ (ESP32 Dev Kit), Arduino JSON, DHT sensor libraries.
* **Machine Learning:** PyTorch (Mock/LSTM logic), Scikit-Learn (Multilayer Perceptron classifier for hardware degradation), pandas, NumPy.
* **Build System:** Vite.

---

## 📦 Directory Structure

```
├── docs/
│   └── proposal.md                 # Complete John Fish Project Proposal
├── firmware/
│   └── HardwareMonitor/
│       ├── HardwareMonitor.ino     # ESP32 firmware code
│       └── secrets.h.example       # Database credentials config template
├── ml/
│   ├── classifier_service.py       # Python service polling RTDB and writing ML predictions
│   ├── train_mlp.py                # Model training script generating model.pkl
│   └── requirements.txt            # Python dependencies
├── src/
│   ├── components/                 # Individual dashboard React views
│   │   ├── Overview.jsx
│   │   ├── ITPrediction.jsx
│   │   ├── FinancialRisk.jsx
│   │   ├── HardwareDegradation.jsx
│   │   ├── Remediation.jsx
│   │   ├── Settings.jsx
│   │   └── Sidebar.jsx
│   ├── App.jsx                     # Shell layout, router, global alert states
│   ├── firebase.js                 # Database configuration client config
│   └── index.css                   # Custom global stylesheet (aesthetics, animations)
├── HARDWARE_SETUP.md               # Pin wiring details & firmware instructions
├── package.json                    # Node dependencies
└── vite.config.js                  # Vite configuration
```

---

## ⚙️ Local Setup Guide

### 1. Frontend Web Dashboard
To run the React dashboard in development mode:

```bash
# 1. Install node dependencies
npm install

# 2. Run the Vite development server
npm run dev
```

The app will start at `http://localhost:5173/`. 
*(Note: If Firebase isn't connected, the Hardware Degradation page will automatically load Client-Side Simulation Mode after 4 seconds so you can still fully demo the layout).*

### 2. Hardware Ingestion (ESP32)
Ensure you have the physical sensor stack wired to the ESP32 Dev Board. 
1. Follow the wiring guidelines in [HARDWARE_SETUP.md](HARDWARE_SETUP.md).
2. Set up a **Firebase Realtime Database** in locked mode. Apply the rules specified in `firebase.rules.json` to allow public reads and restrict public writes.
3. Configure credentials in `firmware/HardwareMonitor/secrets.h` and flash the microcontroller code via the Arduino IDE.

### 3. ML Daemon (Hardware Degradation Classifier)
To train the classifier model and run the real-time polling service:

```bash
cd ml

# 1. Install requirements
pip install -r requirements.txt

# 2. Train the MLP Classifier using synthetic server logs
python train_mlp.py

# 3. Start the live database classification listener
export FIREBASE_DATABASE_URL="https://your-project-rtdb.firebaseio.com"
export FIREBASE_DATABASE_SECRET="your-db-secret-token"
python classifier_service.py
```

The daemon will now poll new rack logs every 5 seconds, feed them into the local `model.pkl`, and write back the classified state prediction (`Normal`, `Degrading`, `Critical`) to the Firebase database, lighting up the physical status LEDs on the rack monitor.
