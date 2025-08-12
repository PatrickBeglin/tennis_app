/*
 * ESP32 Slave Device - Wrist Pronation Sensor
 * 
 * Secondary sensor device for tennis serve analysis using BNO055 IMU.
 * Receives swing triggers from ESP32 Master and records synchronized
 * wrist pronation data during swings.
 * Communicates with master device via ESP-NOW and provides data to react native app
 * upon request for comprehensive swing analysis.
 * 
 * Parts of this code was built on previous example code from arduino example libraries as well as,
 * https://randomnerdtutorials.com/esp-32-arduino-ide/,
 * and https://github.com/programming-electronics-academy/espnow-minimum
 * (last accessed 2025-08-12)
 */

#include <esp_now.h>
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BNO055.h>
#include <utility/imumaths.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <math.h>
#include <cmath>

BLEServer* pServer = NULL;

#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define SLAVE_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a9"

BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;

// class to handle server callbacks
class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
  };

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
  }
};

Adafruit_BNO055 bno = Adafruit_BNO055(-1, 0x28, &Wire);

static const int bufferSize = 200;
float accelBuffer[bufferSize]; // Track acceleration magnitude for impact detection
float pronationBuffer[bufferSize];
int head = 0;
bool recordingActive = false;

// Variable to store if sending data was successful
String success;

// master adress
uint8_t broadcastAddress[] = {0xE8, 0x6B, 0xEA, 0x2F, 0xE8, 0x48};

esp_now_peer_info_t peerInfo;

// pronation variables
imu::Quaternion currentSlaveQuaternion;
imu::Quaternion currentMasterQuaternion;  
float currentPronation;
float pronationDeg; // Raw pronation value (available globally)

// offset for calibration of pronation updated by master
float calibrationOffset = 0;

// Callback when data is sent
void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  Serial.print("\r\nLast Packet Send Status:\t");
  Serial.println(status == ESP_NOW_SEND_SUCCESS ? "Delivery Success" : "Delivery Fail");
  if (status == 0){
    success = "Delivery Success :)";
  }
  else{
    success = "Delivery Fail :(";
  }
}

// Callback when data is received
void OnDataRecv(const esp_now_recv_info *info, const uint8_t *incomingData, int len) {
  
  // Process your tennis data here
  if (len < 1) {
    Serial.println("Invalid data length received");
    return;
  }
  
  uint8_t command = incomingData[0];
  
  if (command == 0x01) {
    Serial.println("Received trigger - start recording");
    startRecording();
  }
  else if (command == 0x02 && len >= 3) {
    Serial.println("Received data request");
    uint8_t swingId = incomingData[1]; // Get swing ID from master
    uint8_t pointsToSend = incomingData[2]; // Get number of points to send from master
    sendData(swingId, pointsToSend);
  }
  else if (command == 0x03 && len >= 17) {
    processQuaternionData(incomingData);
  }
  else if (command == 0x04) {
    Serial.println("Received ping from master");
    calibrationOffset = fabsf(pronationDeg);
    Serial.print("Calibration offset set to: ");
    Serial.println(calibrationOffset);
  }
}

// function to process quaternion data
void processQuaternionData(const uint8_t* data) {
  // Extract quaternion values from the received data
  // Data format: [0x03, w, x, y, z] where w,x,y,z are 4-byte floats
  float w = bytesToFloat(&data[1]);
  float x = bytesToFloat(&data[5]);
  float y = bytesToFloat(&data[9]);
  float z = bytesToFloat(&data[13]);
  
  // Create quaternion object
  imu::Quaternion quat(w, x, y, z);
  currentMasterQuaternion = quat;
}

// record own quaternion data at 50hz like the ones received from master
void recordOwnQuaternionData() {
  imu::Quaternion quat = bno.getQuat();
  currentSlaveQuaternion = quat;
}

// function to calculate current pronation
void calculateCurrentPronation() {
  // 1. Conjugate (inverse) of the slave (upper-arm) quaternion
  imu::Quaternion qS = currentSlaveQuaternion;
  imu::Quaternion qS_conj(qS.w(), -qS.x(), -qS.y(), -qS.z());

  // 2. Relative rotation: q_rel = q_master * q_slave^{-1}
  imu::Quaternion qM = currentMasterQuaternion;
  imu::Quaternion qR(
      qM.w() * qS_conj.w() - qM.x() * qS_conj.x() - qM.y() * qS_conj.y() - qM.z() * qS_conj.z(),
      qM.w() * qS_conj.x() + qM.x() * qS_conj.w() + qM.y() * qS_conj.z() - qM.z() * qS_conj.y(),
      qM.w() * qS_conj.y() - qM.x() * qS_conj.z() + qM.y() * qS_conj.w() + qM.z() * qS_conj.x(),
      qM.w() * qS_conj.z() + qM.x() * qS_conj.y() - qM.y() * qS_conj.x() + qM.z() * qS_conj.w()
  );

  // 3. Renormalize to unit length
  float norm = sqrtf(qR.w()*qR.w() + qR.x()*qR.x() + qR.y()*qR.y() + qR.z()*qR.z());
  qR = imu::Quaternion(qR.w()/norm, qR.x()/norm, qR.y()/norm, qR.z()/norm);

  // 4. Extract roll (rotation about local X):
  //    roll = atan2(2*(w*x + y*z), 1 - 2*(x^2 + y^2))
  float sinr_cosp = 2.0f * (qR.w() * qR.x() + qR.y() * qR.z());
  float cosr_cosp = 1.0f - 2.0f * (qR.x() * qR.x() + qR.y() * qR.y());
  float rollRad   = atan2f(sinr_cosp, cosr_cosp);

  // 5. Convert to degrees
  pronationDeg = rollRad * 180.0f / M_PI;

  // 6. kill tiny noise around zero
  const float deadbandDeg = 1.0f;  
  if (fabsf(pronationDeg) < deadbandDeg) 
      pronationDeg = 0.0f;

  // 7. Store result
  currentPronation = fabsf(pronationDeg - calibrationOffset);
  pronationBuffer[head] = currentPronation;

  Serial.print("Current pronation: ");
  Serial.print(currentPronation);
  Serial.println(" degrees");
}

// function to start recording
void startRecording() {
  recordingActive = true;
  head = 0; // Reset buffer
  
  // Clear the buffer to ensure no old data
  for (int i = 0; i < bufferSize; i++) {
    accelBuffer[i] = 0.0f; 
    pronationBuffer[i] = 0.0f; 
  }
  
  Serial.println("Recording started - buffer cleared");
}

// function to send data
void sendData(uint8_t swingId, uint8_t pointsToSend) {
  // Create binary packet
  uint8_t binaryData[500];
  int dataIndex = 0;

  binaryData[dataIndex++] = 0x03; // 03 for slave
  binaryData[dataIndex++] = swingId; // Swing ID from master
  binaryData[dataIndex++] = 0; // 0x00 for speed
  
  int actualPointsToSend = min(min((int)pointsToSend, head), 99); // 5 bytes per sample (99 * 5 = 495 bytes, within BLE limit)
  binaryData[dataIndex++] = actualPointsToSend; // Number of points
  
  // Find peak impact point (maximum acceleration) within the recorded data
  float maxAccel = 0;
  int impactIndex = 0;
  
  for (int i = 0; i < actualPointsToSend && i < bufferSize; i++) {
    if (accelBuffer[i] > maxAccel) {
      maxAccel = accelBuffer[i];
      impactIndex = i; // Store relative index within recorded data
    }
  }
  
  binaryData[dataIndex++] = (uint8_t)(impactIndex % 256); // impact index (peak acceleration point)
  binaryData[dataIndex++] = 0; // Mock gyro score 
  binaryData[dataIndex++] = 0; // Mock eulerz score 
    
  Serial.print("Slave has ");
  Serial.print(head);
  Serial.print(" points, requested ");
  Serial.print(pointsToSend);
  Serial.print(", sending ");
  Serial.print(actualPointsToSend);
  Serial.println(" points");

  // Send data starting from index 0 
  for (int i = 0; i < actualPointsToSend && i < bufferSize && dataIndex < 495; i++) {
    binaryData[dataIndex++] = (uint8_t)(pronationBuffer[i] * 255.0f / 360.0f); // in native code convert back by dividing by 255 and multiplying by 360
  }

  // Send via ble to phone
  delay(200); 
  Serial.print("Sending BLE data: ");
  Serial.print(dataIndex);
  Serial.print(" bytes | Impact at sample: ");
  Serial.println(impactIndex);
  
  if (pCharacteristic != NULL) {
    pCharacteristic->setValue(binaryData, dataIndex);
    pCharacteristic->notify();
  }
  
  // Stop recording after sending data
  recordingActive = false;
  Serial.println("Recording stopped");
}

void setup() {
  Wire.begin(22, 19);
  Serial.begin(115200);
  Serial.println("go");
  delay(3000); 
  Serial.println("Serial is working");
  while (!Serial) delay(10);
  
  if(!bno.begin()) {
    Serial.print("no BNO055 detected");
    ESP.restart();
  } else {
    Serial.println("BNO055 detected");
  }
  delay(1000);
  bno.setExtCrystalUse(true);
  
  // Check calibration status (only gyro and mag needed for quaternions)
  uint8_t sys, gyro, accel, mag;
  bno.getCalibration(&sys, &gyro, &accel, &mag);
  Serial.print("SLAVE Calibration - Sys:"); Serial.print(sys);
  Serial.print(" Gyro:"); Serial.print(gyro);
  Serial.print(" Mag:"); Serial.println(mag);
  
  // Wait for gyro and mag calibration 
  int calibrationAttempts = 0;
  const int maxAttempts = 300; // 30 seconds timeout
  
  while ((gyro < 3 || mag < 3) && calibrationAttempts < maxAttempts) {
    delay(100);
    bno.getCalibration(&sys, &gyro, &accel, &mag);
    if (calibrationAttempts % 50 == 0) { 
      Serial.print("SLAVE Calibration attempt "); Serial.print(calibrationAttempts);
      Serial.print(" - Sys:"); Serial.print(sys);
      Serial.print(" Gyro:"); Serial.print(gyro);
      Serial.print(" Mag:"); Serial.println(mag);
      Serial.println("SLAVE: Move sensor in figure-8 patterns and rotate around all axes!");
    }
    calibrationAttempts++;
  }
  
  if (gyro >= 3 && mag >= 3) {
    Serial.println("SLAVE: Gyro and Mag calibration achieved!");
  } else {
    Serial.println("SLAVE: Calibration timeout! Check sensor connections and try again.");
  }

  // Create the BLE Device
  BLEDevice::init("ESP32_SLAVE");
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

  // Create a BLE Characteristic 
  pCharacteristic = pService->createCharacteristic(
                      SLAVE_CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_INDICATE | BLECharacteristic::PROPERTY_NOTIFY
                    );
  if (pCharacteristic == NULL) {
    Serial.println("Failed to create BLE characteristic");
    ESP.restart();
  }

  pService->start();

  // Start advertising 
  BLEDevice::getAdvertising()->addServiceUUID(SERVICE_UUID);
  BLEDevice::startAdvertising();
  Serial.println("BLE ready");

  // Set device as a Wi-Fi Station
  WiFi.mode(WIFI_STA);

  // Init ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error initializing ESP-NOW");
    ESP.restart();
  }

  // get the status of Transmitted packet
  esp_now_register_send_cb(OnDataSent);
  
  // Register peer
  memcpy(peerInfo.peer_addr, broadcastAddress, 6);
  peerInfo.channel = 0;  
  peerInfo.encrypt = false;
  
  // Add peer        
  if (esp_now_add_peer(&peerInfo) != ESP_OK){
    Serial.println("Failed to add peer");
    ESP.restart();
  }
  
  // Register for a callback function that will be called when data is received
  esp_now_register_recv_cb(OnDataRecv);
  
  Serial.println("ESP-NOW initialized successfully");
}

void loop() {
  // get sensor data with error checking
  imu::Quaternion quat;
  imu::Vector<3> linearAccel;

  recordOwnQuaternionData();
  calculateCurrentPronation(); 
  
  try {
    quat = bno.getQuat();
    linearAccel = bno.getVector(Adafruit_BNO055::VECTOR_LINEARACCEL);
  } catch (...) {
    Serial.println("Sensor read error, restarting...");
    ESP.restart();
  }

  // Calculate and store acceleration magnitude for impact detection
  float accelMagnitude = sqrt(linearAccel.x()*linearAccel.x() + linearAccel.y()*linearAccel.y() + linearAccel.z()*linearAccel.z());


  // Only record data if recording is active
  if (recordingActive && head < bufferSize) {
    pronationBuffer[head] = currentPronation;  
    accelBuffer[head] = accelMagnitude;
    head = (head + 1) % bufferSize; 
  }

  //50hz
  delay(20);
}

// Utility function to convert bytes back to float
float bytesToFloat(const uint8_t* bytes) {
  union {
    uint8_t bytes[4];
    float value;
  } converter;
  
  converter.bytes[0] = bytes[0];
  converter.bytes[1] = bytes[1];
  converter.bytes[2] = bytes[2];
  converter.bytes[3] = bytes[3];
  
  return converter.value;
}