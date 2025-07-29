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
  } else {
    Serial.println("BNO055 OK");
  }


  // Create the BLE Device
  BLEDevice::init("ESP32_MASTER");
  BLEDevice::setMTU(512);

  // Create the BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create the BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create a BLE Characteristic (simplified)
  pCharacteristic = pService->createCharacteristic(
                      MASTER_CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_INDICATE | BLECharacteristic::PROPERTY_NOTIFY
                    );

  // Start the service
  pService->start();

  // Start advertising (simplified)
  BLEDevice::getAdvertising()->addServiceUUID(SERVICE_UUID);
  BLEDevice::startAdvertising();
  Serial.println("BLE ready");

  WiFi.mode(WIFI_STA);
  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW error");
    return;
  }

  memcpy(peerInfo.peer_addr, slaveAddress, 6);
  peerInfo.channel = 0;  
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK){
    Serial.println("Peer error");
    return;
  }

  Serial.println("Ready");
}


static const int bufferSize = 400; // Reduced from 400 to save memory
imu::Quaternion buffer[bufferSize];
float accelBuffer[bufferSize]; // Track acceleration magnitude for impact detection
int head = 0;

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

void sendSwingData(int startIndex, int endIndex) {
  // Only send if swing has enough samples
  int swingLength = (endIndex - startIndex + bufferSize) % bufferSize;
  if (swingLength < MIN_SWING_DURATION) {
    return;
  }

  static uint8_t swingIdCounter = 0;
  uint8_t swingId = swingIdCounter++;

  sendTriggerToSlave();
  
  // Give slave time to record data (swing duration + buffer)
  delay(100); // Small delay to ensure slave has started recording ==========
  
  int maxPoints = 165; // Back to original 3 bytes per sample
  int pointsToSend = min(swingLength, maxPoints); // cuts off long swings

  // Find peak impact point (maximum acceleration) within the swing
  float maxAccel = 0;
  int impactIndex = 0;
  int currentIndex = startIndex;
  
  for (int i = 0; i < swingLength; i++) {
    if (accelBuffer[currentIndex] > maxAccel) {
      maxAccel = accelBuffer[currentIndex];
      impactIndex = i; // Store relative index within swing
    }
    currentIndex = (currentIndex + 1) % bufferSize;
  }

  //create binary packet 500bytes
  uint8_t binaryData[500];
  int dataIndex = 0;

  binaryData[dataIndex++] = 0x02; // the id for master
  binaryData[dataIndex++] = swingId; // id for the swing
  binaryData[dataIndex++] = (uint8_t)(maxSpeed_mph * 2); // max speed of swing *2 for better accu
  binaryData[dataIndex++] = pointsToSend; // number of points to send
  binaryData[dataIndex++] = (uint8_t)(impactIndex % 256); // impact index (peak acceleration point)

  // convert to binary
  currentIndex = startIndex; // reset to start reading from buffer
  int count = 0; // how many points weve processed

  // loops each data point in the swing and stops at endIndex
  while (count < pointsToSend && currentIndex != endIndex) {
    
    // Send X, Y, and Z components (4 bytes) - W can be reconstructed on RN side
    // X = roll (wrist pronation/supination), Y = pitch (wrist flexion/extension), Z = yaw (wrist rotation)
    // Scale to fit in 12-bit range (-2048 to 2047)
    // First normalize the quaternion to ensure values are in valid range
    float w = buffer[currentIndex].w();
    float x = buffer[currentIndex].x();
    float y = buffer[currentIndex].y();
    float z = buffer[currentIndex].z();
    
    // Clamp raw values to [-1.0, 1.0] range (no normalization)
    x = constrain(x, -1.0f, 1.0f);
    y = constrain(y, -1.0f, 1.0f);
    
    // Removed debug prints to prevent serial buffer overflow
    
    uint16_t x_scaled = (uint16_t)((x + 1.0f) * 1023.5f);
    uint16_t y_scaled = (uint16_t)((y + 1.0f) * 1023.5f);
    
    // Pack 12-bit values efficiently: 3 bytes for X and Y
    // First 2 bytes: X (12 bits) + Y (12 bits)
    binaryData[dataIndex++] = (uint8_t)(x_scaled & 0xFF);           // X low byte
    binaryData[dataIndex++] = (uint8_t)((x_scaled >> 8) & 0x0F) |   // X high 4 bits
                              (uint8_t)((y_scaled << 4) & 0xF0);     // Y low 4 bits
    binaryData[dataIndex++] = (uint8_t)((y_scaled >> 4) & 0xFF);    // Y high 8 bits
    
    currentIndex = (currentIndex + 1) % bufferSize;
    count++;
  }
  Serial.print("Sending BLE data: ");
  Serial.print(dataIndex);
  Serial.print(" bytes | Impact at sample: ");
  Serial.println(impactIndex);

  pCharacteristic->setValue(binaryData, dataIndex);
  pCharacteristic->indicate();
  
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
  accelBuffer[head] = accelMagnitude;
  
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
  // get sensor data
  imu::Quaternion quat = bno.getQuat();
  imu::Vector<3> linearAccel = bno.getVector(Adafruit_BNO055::VECTOR_LINEARACCEL);

  calculateSpeed(linearAccel.x(), linearAccel.y(), linearAccel.z());
  maxSpeed_mph = maxSpeed * 2.23694;
  //Serial.print("Max Speed of swing in mph: "); Serial.println(maxSpeed_mph);

  // Quaternion debug prints
  //Serial.print("Quat W: "); Serial.print(quat.w(), 4);
  //Serial.print(" X: "); Serial.print(quat.x(), 4);
  //Serial.print(" Y: "); Serial.print(quat.y(), 4);
  //Serial.print(" Z: "); Serial.print(quat.z(), 4);
  //Serial.print(" | Accel: "); Serial.print(currentAccel, 2);
  //Serial.print(" | Speed: "); Serial.println(maxSpeed_mph, 1);



  buffer[head] = quat;  // Store current reading
  head = (head + 1) % bufferSize;  // Move head pointer

  if (swingDetected() && !swingActive) {
    Serial.println("Swing start");
    swingActive = true;
    swingStartIndex = (head - 1 + bufferSize) % bufferSize;
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
      swingEndIndex = (head - 1 + bufferSize) % bufferSize; // End at the position where swing ended
      lastSwingTime = millis();  // Set cooldown timer
      
      Serial.print("Swing end: ");
      Serial.println(swingSampleCount);
      
      sendSwingData(swingStartIndex, swingEndIndex);

      // Reset speed tracking for new swing
      maxSpeed = 0;
      vx = 0;
      vy = 0;
      vz = 0;
    }
    
  }
  
  delay(BNO055_SAMPLERATE_DELAY_MS);

  // notify changed value
  if (deviceConnected) {
      //Serial.println("sending data");
      // pCharacteristic->setValue((uint8_t*)dataJson.c_str(), dataJson.length());
      //pCharacteristic->notify(); 
  }
  // disconnecting
  if (!deviceConnected && oldDeviceConnected) {
      delay(500);
      pServer->startAdvertising();
      oldDeviceConnected = deviceConnected;
  }
  // connecting
  if (deviceConnected && !oldDeviceConnected) {
      oldDeviceConnected = deviceConnected;
  }
}