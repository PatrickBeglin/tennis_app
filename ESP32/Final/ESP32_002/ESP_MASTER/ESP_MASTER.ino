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
imu::Vector<3> buffer[bufferSize];
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

  // get the previous and ten back values
  // wraps around bufferSize
  int prev = (head - 1 + bufferSize) % bufferSize;
  int tenBack = (head - 10 + bufferSize) % bufferSize;

  auto curr = buffer[prev];    
  auto earlier = buffer[tenBack]; 

  // Increase threshold to 80 degrees for more realistic swing detection
  if ((fabs(curr.x() - earlier.x()) > DETECT_ROTATION_THRESHOLD ||
      fabs(curr.y() - earlier.y()) > DETECT_ROTATION_THRESHOLD ||
      fabs(curr.z() - earlier.z()) > DETECT_ROTATION_THRESHOLD) &&
      (currentAccel > DETECT_ACCEL_THRESHOLD))
       {
    return true;
  }

  if ((fabs(curr.x() - earlier.x()) > DETECT_ROTATION_THRESHOLD_LOW ||
      fabs(curr.y() - earlier.y()) > DETECT_ROTATION_THRESHOLD_LOW ||
      fabs(curr.z() - earlier.z()) > DETECT_ROTATION_THRESHOLD_LOW) &&
      (currentAccel > DETECT_ACCEL_THRESHOLD_LOW)) {
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
  
  int maxPoints = 169; 
  int pointsToSend = min(swingLength, maxPoints); // cuts off long swings

  //create binary packet 500bytes
  uint8_t binaryData[500];
  int dataIndex = 0;

  binaryData[dataIndex++] = 0x02; // the id for master
  binaryData[dataIndex++] = swingId; // id for the swing
  binaryData[dataIndex++] = (uint8_t)(maxSpeed_mph * 2); // max speed of swing *2 for better accu
  binaryData[dataIndex++] = pointsToSend; // number of points to send

  // convert to binary
  int currentIndex = startIndex; // where to start reading from buffer
  int count = 0; // how many points weve processed

  // loops each data point in the swing and stops at endIndex
  while (count < pointsToSend && currentIndex != endIndex) {
    // Timestamp (2 bytes - milliseconds since swing start)
    //unsigned long timestamp = count * 20; // 0, 20, 40, 60... ms at 50Hz
    //binaryData[dataIndex++] = (timestamp >> 8) & 0xFF;  // High byte
    //binaryData[dataIndex++] = timestamp & 0xFF;// Low byte
    
    // X, Y, Z values (3 bytes, signed)
    binaryData[dataIndex++] = (int8_t)buffer[currentIndex].x();
    binaryData[dataIndex++] = (int8_t)buffer[currentIndex].y();
    binaryData[dataIndex++] = (int8_t)buffer[currentIndex].z();
    
    currentIndex = (currentIndex + 1) % bufferSize;
    count++;
  }
  Serial.print("Sending BLE data: ");
  Serial.print(dataIndex);
  Serial.println(" bytes");

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
  imu::Vector<3> euler = bno.getVector(Adafruit_BNO055::VECTOR_EULER);
  imu::Vector<3> linearAccel = bno.getVector(Adafruit_BNO055::VECTOR_LINEARACCEL);

  calculateSpeed(linearAccel.x(), linearAccel.y(), linearAccel.z());
  maxSpeed_mph = maxSpeed * 2.23694;
  //Serial.print("Max Speed of swing in mph: "); Serial.println(maxSpeed_mph);

  // test prints
  //Serial.print("X: "); Serial.print(euler.x());
  //Serial.print(" Y: "); Serial.print(euler.y());
  //Serial.print(" Z: "); Serial.println(euler.z());



  buffer[head] = euler;  // Store current reading
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