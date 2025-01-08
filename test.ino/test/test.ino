#include <WiFi.h>
#include "GyverButton.h"
#include "PubSubClient.h"
#include "ArduinoJson.h"
#include <LiquidCrystal.h>
#include <EEPROM.h>
#include "TimerMs.h"

// Pins
const uint8_t LED_PIN = 23;
const uint8_t BUTTON_PIN = 22;

// WiFi
const char *ssid = ""; // Enter your WiFi name
const char *password = "";  // Enter WiFi password

// MQTT Broker
const char *mqtt_broker = "";
const char *topic_button = "esp32/button";
const char *topic_display = "esp32/display";
const char *topic_update = "esp32/update";
const char *topic_status = "esp32/status";
const char *mqtt_username = "admin";
const char *mqtt_password = "admin76767676";
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient client(espClient);

LiquidCrystal lcd(19, 18, 17, 16, 15, 14);
GButton Button(BUTTON_PIN);

TimerMs saveTimer(3000, 0, 1);

struct Cfg
{
  bool isLedActive;
  char line1[17];
  char line2[17];
};

Cfg config;

void callback(char *topic, byte *payload, unsigned int length)
{
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, payload);
  if (error) {
    Serial.print(F("deserializeJson() failed: "));
    Serial.println(error.f_str());
    return;
  }

  if (strcmp(topic, topic_button) == 0)
  {
    config.isLedActive = doc["isLedActive"];
    UpdateLed();
    Serial.println(config.isLedActive);
  }
  else if (strcmp(topic, topic_display) == 0)
  {
    strcpy(config.line1, doc["line1"]);
    strcpy(config.line2, doc["line2"]);

    UpdateDisplay();
  }
  else
  {
    PublishConfig();
  }
}

void PublishConfig()
{
  JsonDocument doc;
  doc["isLedActive"] = config.isLedActive;
  doc["line1"] = config.line1;
  doc["line2"] = config.line2;
  String json;
  serializeJsonPretty(doc, json);
  client.publish(topic_status, json.c_str());
}

void UpdateLed()
{
  digitalWrite(LED_PIN, config.isLedActive * 255);
  UpdateMemory();
}

void UpdateDisplay()
{
  lcd.clear();
  lcd.print(config.line1);
  lcd.setCursor(0, 1);
  lcd.print(config.line2);
  UpdateMemory();
}

void UpdateMemory()
{
  EEPROM.put(0, config);
  saveTimer.start();
}

void SaveConfig()
{
  EEPROM.commit();
  Serial.print("LED = ");
  Serial.print(config.isLedActive);
  Serial.print("; line1 = ");
  Serial.print(config.line1);
  Serial.print("; line2 = ");
  Serial.print(config.line2);
}

void ButtonClickEvent()
{
  config.isLedActive = !config.isLedActive;

  JsonDocument doc;
  doc["isLedActive"] = config.isLedActive;
  String json;
  serializeJsonPretty(doc, json);
  client.publish(topic_button, json.c_str());

  UpdateLed();
}

void setup()
{
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.println("Connecting to WiFi..");
  }

  client.setServer(mqtt_broker, mqtt_port);
  client.setCallback(callback);
  while (!client.connected()) 
  {
      String client_id = "esp32-client-";
      client_id += String(WiFi.macAddress());
      Serial.printf("The client %s connects to the public MQTT broker\n", client_id.c_str());
      if (client.connect(client_id.c_str(), mqtt_username, mqtt_password))
      {
          Serial.println("Public EMQX MQTT broker connected");
      } 
      else
      {
          Serial.print("failed with state ");
          Serial.print(client.state());
          delay(2000);
      }
  }

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT);
  lcd.begin(16, 2);

  EEPROM.begin(512);
  EEPROM.get(0, config);
  UpdateLed();
  UpdateDisplay();
  saveTimer.stop();
  saveTimer.attach(SaveConfig);

  client.subscribe(topic_button);
  client.subscribe(topic_display);
  client.subscribe(topic_update);
  PublishConfig();
}
 
void loop()
{
  saveTimer.tick();
  Button.tick();
  client.loop();

  if (Button.isClick())
  {
    ButtonClickEvent();
  }
}