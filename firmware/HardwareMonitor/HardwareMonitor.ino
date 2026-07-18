// AegisAI Smart Server Rack Monitor -- ESP32 firmware
//
// Reads ambient (DHT11) and direct component (thermistor) temperature, a
// door tilt switch, and a water/leak sensor. Publishes telemetry to Firebase
// Realtime Database, drives local LED/buzzer alerts independent of cloud
// connectivity, and reflects the AI classifier's prediction (written by the
// Python classifier service in ml/classifier_service.py) on the red LED.
//
// Board: ESP32 Dev Module
// Libraries (install via Arduino Library Manager):
//   - DHT sensor library (Adafruit)
//   - Adafruit Unified Sensor
//   - ArduinoJson
//
// Before building: copy secrets.h.example to secrets.h and fill in your
// WiFi + Firebase credentials. secrets.h is gitignored.

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include "secrets.h"

// ---------- Pin assignments ----------
#define PIN_DHT11        4    // DHT11 data pin
#define PIN_THERMISTOR   34   // Analog input (ADC1), thermistor voltage divider
#define PIN_DOOR_SENSOR  27   // Tilt switch / reed switch on rack door (digital)
#define PIN_WATER_SENSOR 35   // Analog input, water/leak sensor
#define PIN_LED_GREEN    25   // Normal operation
#define PIN_LED_RED      26   // AI-predicted warning/critical
#define PIN_BUZZER       33   // Active buzzer

// ---------- Thermistor (NTC) constants ----------
// Standard 10k NTC on a voltage divider with a 10k series resistor.
#define THERMISTOR_NOMINAL_RES   10000.0
#define THERMISTOR_NOMINAL_TEMP  25.0
#define THERMISTOR_B_COEFFICIENT 3950.0
#define SERIES_RESISTOR          10000.0
#define ADC_MAX                  4095.0

// ---------- Local safety thresholds (fast loop, no cloud round-trip) ----------
// Keep these in sync with the client-side classify() fallback in
// src/components/HardwareDegradation.jsx.
#define TEMP_DEGRADING_C   65.0
#define TEMP_CRITICAL_C    85.0
#define WATER_THRESHOLD    2000   // raw ADC reading above which water is considered detected

#define RACK_ID            "rack-01"
#define TELEMETRY_INTERVAL_MS 2000

DHT dht(PIN_DHT11, DHT11);

unsigned long lastTelemetryAt = 0;
bool lastDoorOpen = false;
bool lastWaterDetected = false;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_DOOR_SENSOR, INPUT_PULLUP);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  dht.begin();
  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  float ambientTemp = dht.readTemperature();
  float ambientHumidity = dht.readHumidity();
  float componentTemp = readThermistorTempC();
  bool doorOpen = digitalRead(PIN_DOOR_SENSOR) == LOW; // tilt switch pulls low when open, wire per your switch's normal state
  bool waterDetected = analogRead(PIN_WATER_SENSOR) > WATER_THRESHOLD;

  if (isnan(ambientTemp) || isnan(ambientHumidity)) {
    Serial.println("DHT11 read failed, skipping this cycle");
    delay(1000);
    return;
  }

  // ---- Fast local safety loop: independent of Firebase / AI latency ----
  bool localCritical = componentTemp >= TEMP_CRITICAL_C || waterDetected;
  bool localWarning = componentTemp >= TEMP_DEGRADING_C || doorOpen;

  digitalWrite(PIN_LED_GREEN, (!localCritical && !localWarning) ? HIGH : LOW);
  digitalWrite(PIN_LED_RED, (localCritical || localWarning) ? HIGH : LOW);
  digitalWrite(PIN_BUZZER, (waterDetected || (doorOpen && !lastDoorOpen)) ? HIGH : LOW);

  if (doorOpen != lastDoorOpen) {
    pushEvent("tamper", doorOpen ? "Rack door opened - tilt switch triggered." : "Rack door closed.");
    lastDoorOpen = doorOpen;
  }
  if (waterDetected != lastWaterDetected) {
    if (waterDetected) pushEvent("water", "Water sensor triggered - possible leak/condensation.");
    lastWaterDetected = waterDetected;
  }

  // ---- Cloud telemetry loop ----
  if (millis() - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryAt = millis();
    pushTelemetry(ambientTemp, ambientHumidity, componentTemp, doorOpen, waterDetected);

    // Reflect the AI classifier's last written prediction on the red LED too,
    // so it stays lit for AI-predicted "Degrading"/"Critical" even once the
    // fast local thresholds above go quiet.
    String aiState = fetchPredictionState();
    if (aiState == "Critical" || aiState == "Degrading") {
      digitalWrite(PIN_LED_RED, HIGH);
      digitalWrite(PIN_LED_GREEN, LOW);
    }
  }

  delay(200);
}

void connectWiFi() {
  Serial.printf("Connecting to WiFi \"%s\"...\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(300);
    Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? "\nWiFi connected" : "\nWiFi connect timed out, will retry");
}

float readThermistorTempC() {
  int raw = analogRead(PIN_THERMISTOR);
  float resistance = SERIES_RESISTOR / (ADC_MAX / (float)raw - 1.0);

  float steinhart;
  steinhart = resistance / THERMISTOR_NOMINAL_RES;
  steinhart = log(steinhart);
  steinhart /= THERMISTOR_B_COEFFICIENT;
  steinhart += 1.0 / (THERMISTOR_NOMINAL_TEMP + 273.15);
  steinhart = 1.0 / steinhart;
  steinhart -= 273.15;
  return steinhart;
}

// Firebase Realtime Database REST helpers (legacy database secret auth --
// simplest path for a prototype; see HARDWARE_SETUP.md for production auth options).

void pushTelemetry(float ambientTemp, float ambientHumidity, float componentTemp, bool doorOpen, bool waterDetected) {
  if (WiFi.status() != WL_CONNECTED) return;

  StaticJsonDocument<256> doc;
  doc["ts"] = (uint64_t)millis(); // swap for real epoch time (NTP) in production
  doc["ambientTemp"] = ambientTemp;
  doc["ambientHumidity"] = ambientHumidity;
  doc["componentTemp"] = componentTemp;
  doc["doorOpen"] = doorOpen;
  doc["waterDetected"] = waterDetected;

  String body;
  serializeJson(doc, body);

  String url = String(DATABASE_URL) + "/racks/" + RACK_ID + "/telemetry.json?auth=" + DATABASE_SECRET;
  httpRequest("POST", url, body);
}

void pushEvent(const char* type, const char* message) {
  if (WiFi.status() != WL_CONNECTED) return;

  StaticJsonDocument<256> doc;
  doc["ts"] = (uint64_t)millis();
  doc["type"] = type;
  doc["message"] = message;

  String body;
  serializeJson(doc, body);

  String url = String(DATABASE_URL) + "/racks/" + RACK_ID + "/events.json?auth=" + DATABASE_SECRET;
  httpRequest("POST", url, body);
}

String fetchPredictionState() {
  if (WiFi.status() != WL_CONNECTED) return "";

  String url = String(DATABASE_URL) + "/racks/" + RACK_ID + "/prediction/state.json?auth=" + DATABASE_SECRET;
  String result = httpRequest("GET", url, "");
  result.replace("\"", "");
  result.trim();
  return result;
}

String httpRequest(const char* method, const String& url, const String& body) {
  WiFiClientSecure client;
  client.setInsecure(); // prototype only -- pin the Firebase root CA for production
  HTTPClient http;
  String response = "";

  if (!http.begin(client, url)) {
    Serial.println("HTTP begin failed for " + url);
    return response;
  }
  http.addHeader("Content-Type", "application/json");

  int code;
  if (String(method) == "GET") {
    code = http.GET();
  } else if (String(method) == "POST") {
    code = http.POST(body);
  } else {
    code = http.PUT(body);
  }

  if (code > 0) {
    response = http.getString();
  } else {
    Serial.printf("HTTP %s failed: %s\n", method, http.errorToString(code).c_str());
  }
  http.end();
  return response;
}
