// Minimal DHT11 test -- confirms wiring and library setup before building
// the full rack monitor. No WiFi/Firebase needed for this one.
//
// Wiring: DHT11 VCC -> 3.3V, GND -> GND, DATA -> GPIO4
// Library needed: "DHT sensor library" by Adafruit (+ its dependency
// "Adafruit Unified Sensor", installed automatically if prompted)

#include <DHT.h>

#define PIN_DHT11 4
DHT dht(PIN_DHT11, DHT11);

void setup() {
  Serial.begin(115200);
  dht.begin();
  Serial.println("DHT11 test starting...");
}

void loop() {
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (isnan(temp) || isnan(humidity)) {
    Serial.println("Failed to read from DHT11 -- check wiring (VCC/GND/DATA on GPIO4)");
  } else {
    Serial.printf("Temp: %.1f C   Humidity: %.1f %%\n", temp, humidity);
  }

  delay(2000); // DHT11 can only be read about once every 2 seconds
}
