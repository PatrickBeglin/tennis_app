#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BNO055.h>
#include <utility/imumaths.h>
#include <esp_now.h>
#include <WiFi.h>

uint8_t slaveAddress[] = {0xE8, 0x6B, 0xEA, 0x2F, 0xE8, 0x48};
esp_now_peer_info_t peerInfo;

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// 50hz - reduced to prevent packet overlap
#define BNO055_SAMPLERATE_DELAY_MS (20)
Adafruit_BNO055 bno = Adafruit_BNO055(-1, 0x28, &Wire);

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define MASTER_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
    }
};

void setup() {
  Wire.begin(22, 19);
  Serial.begin(115200);
  delay(1000);
  
  if(!bno.begin()) {
    Serial.println("BNO055 error");
    ESP.restart();
  } else {
    Serial.println("BNO055 OK");
  }
  delay(1000);
  bno.setExtCrystalUse(true);
  
  // Check calibration status (need all sensors for swing detection and speed calculation)
  uint8_t sys, gyro, accel, mag;
  bno.getCalibration(&sys, &gyro, &accel, &mag);
  Serial.print("MASTER Calibration - Sys:"); Serial.print(sys);
  Serial.print(" Gyro:"); Serial.print(gyro);
  Serial.print(" Accel:"); Serial.print(accel);
  Serial.print(" Mag:"); Serial.println(mag);
  
  // Wait for full calibration with timeout
  int calibrationAttempts = 0;
  const int maxAttempts = 300; // 30 seconds timeout
  
  while (sys < 3 && calibrationAttempts < maxAttempts) {
    delay(100);
    bno.getCalibration(&sys, &gyro, &accel, &mag);
    if (calibrationAttempts % 50 == 0) { // Only print every 50 attempts (5 seconds)
      Serial.print("MASTER Calibration attempt "); Serial.print(calibrationAttempts);
      Serial.print(" - Sys:"); Serial.print(sys);
      Serial.print(" Gyro:"); Serial.print(gyro);
      Serial.print(" Accel:"); Serial.print(accel);
      Serial.print(" Mag:"); Serial.println(mag);
      Serial.println("MASTER: Move sensor in figure-8 patterns and rotate around all axes!");
    }
    calibrationAttempts++;
  }
  
  if (sys >= 3) {
    Serial.println("MASTER: Full calibration achieved!");
  } else {
    Serial.println("MASTER: Calibration timeout! Check sensor connections and try again.");
  }

  // Create the BLE Device
  BLEDevice::init("ESP32_MASTER");
  BLEDevice::setMTU(512);

  // Create the BLE Server
  pServer = BLEDevice::createServer();
  if (pServer == NULL) {
    Serial.println("Failed to create BLE server");
    ESP.restart();
  }
  pServer->setCallbacks(new MyServerCallbacks());

  // Create the BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);
  if (pService == NULL) {
    Serial.println("Failed to create BLE service");
    ESP.restart();
  }

  // Create a BLE Characteristic (simplified)
  pCharacteristic = pService->createCharacteristic(
                      MASTER_CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_INDICATE | BLECharacteristic::PROPERTY_NOTIFY
                    );
  if (pCharacteristic == NULL) {
    Serial.println("Failed to create BLE characteristic");
    ESP.restart();
  }

  // Start the service
  pService->start();

  // Start advertising (simplified)
  BLEDevice::getAdvertising()->addServiceUUID(SERVICE_UUID);
  BLEDevice::startAdvertising();
  Serial.println("BLE ready");

  WiFi.mode(WIFI_STA);
  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW error");
    ESP.restart();
  }

  memcpy(peerInfo.peer_addr, slaveAddress, 6);
  peerInfo.channel = 0;  
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK){
    Serial.println("Peer error");
    ESP.restart();
  }

  Serial.println("Ready");
}

static const int bufferSize = 200; // Reduced from 400 to save memory
float accelBuffer[bufferSize]; // Track acceleration magnitude for impact detection
float gyroYBuffer[bufferSize]; // Track Y-axis gyroscope for rotation speed at contact
float eulerZBuffer[bufferSize]; // Track Euler Z for rotation speed at contact
int head = 0;
bool recordingActive = false;

bool swingActive = false;
int swingStartIndex = 0;
int swingEndIndex = 0;
unsigned long lastSwingTime = 0;  // Add cooldown tracking
const unsigned long SWING_COOLDOWN_MS = 1000;  // 2 second cooldown
const int MIN_SWING_DURATION = 20;  // Minimum 5 samples for a swing (reduced from 20)
int swingSampleCount = 0;  // Track samples during swing

// change these to get accurate swing detection
const float DETECT_ROTATION_THRESHOLD = 0;
const float DETECT_ACCEL_THRESHOLD = 8.0;
const float DETECT_ROTATION_THRESHOLD_LOW = 0;
const float DETECT_ACCEL_THRESHOLD_LOW = 4.0;

// Global speed variable
float maxSpeed_mph = 0;
float currentAccel = 0;

float fastestYrotationSpeed = 0;
float currentEulerZ = 0;
float swingFastestYrotationSpeed = 0; // Track fastest Y rotation during current swing

bool swingDetected(){
  // Check cooldown first
  if (millis() - lastSwingTime < SWING_COOLDOWN_MS) {
    return false;
  }

  // Simple acceleration-based swing detection
  // Quaternions will be used for wrist pronation analysis, not swing detection
  if (currentAccel > DETECT_ACCEL_THRESHOLD) {
    return true;
  }

  if (currentAccel > DETECT_ACCEL_THRESHOLD_LOW) {
    return true;
  }

  return false;
}

void startRecording() {
  recordingActive = true;
  head = 0; // Reset buffer to start fresh
  swingFastestYrotationSpeed = 0; // Reset swing-specific fastest Y rotation
  
  // Clear the buffer to ensure no old data
  for (int i = 0; i < bufferSize; i++) {
    //buffer[i] = imu::Quaternion(1, 0, 0, 0); // Identity quaternion
    accelBuffer[i] = 0.0f; // Clear acceleration buffer
    gyroYBuffer[i] = 0.0f; // Clear gyro buffer
    eulerZBuffer[i] = 0.0f; // Clear Euler Z buffer
  }
  
  Serial.println("MASTER Recording started - buffer cleared");
}

void sendSwingData(int startIndex, int endIndex) {
  // Only send if swing has enough samples
  int swingLength = head; // Use head directly since we reset buffer
  if (swingLength < MIN_SWING_DURATION) {
    return;
  }

  static uint8_t swingIdCounter = 0;
  uint8_t swingId = swingIdCounter++;

  sendTriggerToSlave();
  
  // Give slave time to record data (swing duration + buffer)
  delay(100); // Small delay to ensure slave has started recording ==========
  
  int maxPoints = 99; // 5 bytes per sample (99 * 5 = 495 bytes, leaving room for header)
  int pointsToSend = min(swingLength, maxPoints); // cuts off long swings

  // Find peak impact point (maximum acceleration) within the swing
  float maxAccel = 0;
  int impactIndex = 0;
  
  for (int i = 0; i < swingLength && i < bufferSize; i++) {
    if (accelBuffer[i] > maxAccel) {
      maxAccel = accelBuffer[i];
      impactIndex = i; // Store relative index within swing
    }
  }

  // Get fastest Y-axis rotation speed during the swing
  float fastestYrotationSpeed = swingFastestYrotationSpeed;

  float impactEulerZ = (impactIndex < bufferSize) ? eulerZBuffer[impactIndex] : 0.0f;
  
  //create binary packet 500bytes
  uint8_t binaryData[500];
  int dataIndex = 0;

  binaryData[dataIndex++] = 0x02; // the id for master
  binaryData[dataIndex++] = swingId; // id for the swing
  binaryData[dataIndex++] = (uint8_t)(maxSpeed_mph * 2); // max speed of swing *2 for better accu
  binaryData[dataIndex++] = pointsToSend; // number of points to send
  binaryData[dataIndex++] = (uint8_t)(impactIndex % 256); // impact index (peak acceleration point)
  binaryData[dataIndex++] = (uint8_t)((fastestYrotationSpeed + 2000) / 15.625); // Fastest Y-axis rotation during swing (8-bit, ±2000°/s range)
  binaryData[dataIndex++] = (uint8_t)(impactEulerZ * 255.0f / 360.0f); // Euler Z angle at impact (0-360° mapped to 0-255) 
  binaryData[dataIndex++] = 0; // mock pronation data


  Serial.print("Sending BLE data: ");
  Serial.print(dataIndex);
  Serial.print(" bytes | Impact at sample: ");
  Serial.println(impactIndex);

  if (pCharacteristic != NULL) {
    pCharacteristic->setValue(binaryData, dataIndex);
    pCharacteristic->indicate();
  }
  
  // Wait for BLE transmission to complete before requesting slave data
  delay(1000);
  requestDataFromSlave(swingId, pointsToSend);
}

void sendTriggerToSlave() {
  uint8_t triggerData[1] = {0x01}; // Command to start recording
  
  esp_err_t result = esp_now_send(slaveAddress, triggerData, 1);
  if (result == ESP_OK) {
    Serial.println("Trigger sent");
  } else {
    Serial.println("Trigger error");
  }
}

void floatToBytes(float value, uint8_t *bytes) {
  memcpy(bytes, &value, sizeof(float));
}

// send quaternion to slave
void sendQuaternionToSlave(imu::Quaternion quat) {
  uint8_t quaternionData[17]; // 16 bytes for quaternion + 1 byte for command
  quaternionData[0] = 0x03; // Command 0x03 for quaternion data
  floatToBytes(quat.w(), &quaternionData[1]);
  floatToBytes(quat.x(), &quaternionData[5]);
  floatToBytes(quat.y(), &quaternionData[9]);
  floatToBytes(quat.z(), &quaternionData[13]);

  esp_err_t result = esp_now_send(slaveAddress, quaternionData, 17);
  if (result != ESP_OK) {
    Serial.println("Quaternion error sending to slave");
  }
}

void requestDataFromSlave(uint8_t swingId, uint8_t pointsToSend) {
  uint8_t requestData[3] = {0x02, swingId, pointsToSend}; // Command, swing ID, points
  
  esp_err_t result = esp_now_send(slaveAddress, requestData, 3);
  if (result == ESP_OK) {
    Serial.println("Request sent");
  } else {
    Serial.println("Request error");
  }
}

float vx = 0, vy = 0, vz = 0;
float maxSpeed = 0;
const float dt = 0.02; // 50hz to calculate speed from acceleration
const float DRIFT_THRESHOLD = 1.5; // Threshold to detect when device is at rest 

void calculateSpeed(float ax, float ay, float az) {
  // Check if device is at rest (low acceleration)
  float accelMagnitude = sqrt(ax*ax + ay*ay + az*az);
  currentAccel = accelMagnitude;
  
  // Store acceleration magnitude in buffer for impact detection
  if (head < bufferSize) {
    accelBuffer[head] = accelMagnitude;
  }
  
  if (accelMagnitude < DRIFT_THRESHOLD) {
    // Reset velocity when device is at rest to prevent drift
    vx = 0;
    vy = 0;
    vz = 0;
  } else {
    // Only integrate acceleration when there's significant movement
    vx += ax * dt;
    vy += ay * dt;
    vz += az * dt;
  }

  float speed = sqrt(vx*vx + vy*vy + vz*vz);
  if (speed > maxSpeed) {
      maxSpeed = speed;
  }
}

const int SWING_END_SETTLE_SAMPLES = 5;
int noDetected = 0;

void loop() {
  // get sensor data with error checking
  imu::Quaternion quat;
  imu::Vector<3> linearAccel;
  imu::Vector<3> angularVel;
  imu::Vector<3> euler;
  
  try {
    quat = bno.getQuat();
    linearAccel = bno.getVector(Adafruit_BNO055::VECTOR_LINEARACCEL);
    angularVel = bno.getVector(Adafruit_BNO055::VECTOR_GYROSCOPE);
    euler = bno.getVector(Adafruit_BNO055::VECTOR_EULER);
  } catch (...) {
    Serial.println("Sensor read error, restarting...");
    ESP.restart();
  }

  // Calculate Y-axis rotation speed
  float currentYrotationSpeed = angularVel.y();
  if (currentYrotationSpeed > fastestYrotationSpeed) {
    fastestYrotationSpeed = currentYrotationSpeed;
  }

  currentEulerZ = euler.z();

  calculateSpeed(linearAccel.x(), linearAccel.y(), linearAccel.z());
  maxSpeed_mph = maxSpeed * 2.23694;

  // Only record data if recording is active
  if (recordingActive && head < bufferSize) {
    accelBuffer[head] = currentAccel;  // Store acceleration magnitude
    gyroYBuffer[head] = currentYrotationSpeed;  // Store Y-axis gyroscope
    eulerZBuffer[head] = currentEulerZ;  // Store Euler Z angle
    
    // Track fastest Y rotation during this swing
    if (currentYrotationSpeed > swingFastestYrotationSpeed) {
      swingFastestYrotationSpeed = currentYrotationSpeed;
    }
    
    head = (head + 1) % bufferSize;  // Move head pointer
  }

  if (swingDetected() && !swingActive) {
    Serial.println("Swing start");
    swingActive = true;
    startRecording(); // Start recording with fresh buffer
    swingSampleCount = 0;
  }

  if (swingActive) {
    swingSampleCount++;  // Count samples during swing


    if (!swingDetected()) {
      noDetected++;
    } else {
      noDetected = 0;
    }

    if (noDetected > SWING_END_SETTLE_SAMPLES && swingSampleCount > MIN_SWING_DURATION) {
      swingActive = false;
      recordingActive = false; // Stop recording
      lastSwingTime = millis();  // Set cooldown timer
      
      Serial.print("Swing end: ");
      Serial.println(swingSampleCount);
      
      sendSwingData(0, head); // Send data from start to current head position

      // Reset speed tracking for new swing
      maxSpeed = 0;
      vx = 0;
      vy = 0;
      vz = 0;
    }
  }

  sendQuaternionToSlave(quat);
  
  delay(BNO055_SAMPLERATE_DELAY_MS);

  // disconnecting
  if (!deviceConnected && oldDeviceConnected) {
      delay(500);
      if (pServer != NULL) {
        pServer->startAdvertising();
      }
      oldDeviceConnected = deviceConnected;
  }
  // connecting
  if (deviceConnected && !oldDeviceConnected) {
      oldDeviceConnected = deviceConnected;
  }
}