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

//ble stuff
BLEServer* pServer = NULL;

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define SLAVE_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a9"

BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;

class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
  };

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
  }
};

Adafruit_BNO055 bno = Adafruit_BNO055(-1, 0x28, &Wire);

static const int bufferSize = 400;
imu::Quaternion buffer[bufferSize];
float accelBuffer[bufferSize]; // Track acceleration magnitude for impact detection
int head = 0;
bool recordingActive = false;


// Variable to store if sending data was successful
String success;

// master adress
uint8_t broadcastAddress[] = {0xE8, 0x6B, 0xEA, 0x2F, 0xE8, 0x48};

esp_now_peer_info_t peerInfo;

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
  Serial.print("ping received stating to record data");
  
  // Process your tennis data here
  uint8_t command = incomingData[0];
  
  if (command == 0x01) {
    Serial.println("Received trigger - start recording");
    startRecording();
  }
  else if (command == 0x02) {
    Serial.println("Received data request");
    uint8_t swingId = incomingData[1]; // Get swing ID from master
    uint8_t pointsToSend = incomingData[2]; // Get number of points to send from master
    sendData(swingId, pointsToSend);
  }
}


void startRecording() {
  recordingActive = true;
  head = 0; // Reset buffer to start fresh
  
  // Clear the buffer to ensure no old data
  for (int i = 0; i < bufferSize; i++) {
    buffer[i] = imu::Quaternion(1, 0, 0, 0); // Identity quaternion
    accelBuffer[i] = 0.0f; // Clear acceleration buffer
  }
  
  Serial.println("Recording started - buffer cleared");
}

void sendData(uint8_t swingId, uint8_t pointsToSend) {
  // Create binary packet
  uint8_t binaryData[250]; // ESP-NOW limit
  int dataIndex = 0;

  binaryData[dataIndex++] = 0x03; // 03 for slave
  binaryData[dataIndex++] = swingId; // Swing ID from master
  binaryData[dataIndex++] = 0; // 0x00 for speed
  
  // Limit points to send based on available data and ESP-NOW limit
  int actualPointsToSend = min(min((int)pointsToSend, head), 82); // Back to original 3 bytes per sample
  binaryData[dataIndex++] = actualPointsToSend; // Number of points
  
  // Find peak impact point (maximum acceleration) within the recorded data
  float maxAccel = 0;
  int impactIndex = 0;
  
  for (int i = 0; i < actualPointsToSend; i++) {
    if (accelBuffer[i] > maxAccel) {
      maxAccel = accelBuffer[i];
      impactIndex = i; // Store relative index within recorded data
    }
  }
  
  binaryData[dataIndex++] = (uint8_t)(impactIndex % 256); // impact index (peak acceleration point)
  
  Serial.print("Slave has ");
  Serial.print(head);
  Serial.print(" points, requested ");
  Serial.print(pointsToSend);
  Serial.print(", sending ");
  Serial.print(actualPointsToSend);
  Serial.println(" points");

  // Send data starting from index 0 (since we reset the buffer)
  for (int i = 0; i < actualPointsToSend; i++) {
    
    // Send only X and Y components (3 bytes) - W and Z can be reconstructed on RN side
    // X = roll (wrist pronation/supination), Y = pitch (wrist flexion/extension)
    // Scale to fit in 12-bit range (-2048 to 2047)
    // First normalize the quaternion to ensure values are in valid range
    float w = buffer[i].w();
    float x = buffer[i].x();
    float y = buffer[i].y();
    float z = buffer[i].z();
    
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
  }

  // Send via ble to phone
  delay(200); // Reduced delay to prevent interference with other esp
  Serial.print("Sending BLE data: ");
  Serial.print(dataIndex);
  Serial.print(" bytes | Impact at sample: ");
  Serial.println(impactIndex);
  pCharacteristic->setValue(binaryData, dataIndex);
  pCharacteristic->notify();
  
  // Stop recording after sending data
  recordingActive = false;
  Serial.println("Recording stopped");
}


 
void setup() {
  Wire.begin(22, 19);
  Serial.begin(115200);
  Serial.println("go");
  delay(3000);  // Let USB settle
  Serial.println("Serial is working");
  while (!Serial) delay(10);
  
  if(!bno.begin())
  {
    Serial.print("no BNO055 detected");
  } else {
    Serial.println("BNO055 detected");
  }
  delay(1000);
  bno.setExtCrystalUse(true);
  
  // Check calibration status
  uint8_t sys, gyro, accel, mag;
  bno.getCalibration(&sys, &gyro, &accel, &mag);
  Serial.print("SLAVE Calibration - Sys:"); Serial.print(sys);
  Serial.print(" Gyro:"); Serial.print(gyro);
  Serial.print(" Accel:"); Serial.print(accel);
  Serial.print(" Mag:"); Serial.println(mag);
  
  // Wait for full calibration with timeout
  int calibrationAttempts = 0;
  const int maxAttempts = 300; // 30 seconds timeout
  
  while (sys < 3 && calibrationAttempts < maxAttempts) {
    delay(100);
    bno.getCalibration(&sys, &gyro, &accel, &mag);
    Serial.print("SLAVE Calibration attempt "); Serial.print(calibrationAttempts);
    Serial.print(" - Sys:"); Serial.print(sys);
    Serial.print(" Gyro:"); Serial.print(gyro);
    Serial.print(" Accel:"); Serial.print(accel);
    Serial.print(" Mag:"); Serial.println(mag);
    
    if (calibrationAttempts % 50 == 0) { // Every 5 seconds
      Serial.println("SLAVE: Move sensor in figure-8 patterns and rotate around all axes!");
    }
    
    calibrationAttempts++;
  }
  
  if (sys >= 3) {
    Serial.println("SLAVE: Full calibration achieved!");
  } else {
    Serial.println("SLAVE: Calibration timeout! Check sensor connections and try again.");
  }

  // Create the BLE Device
  BLEDevice::init("ESP32_SLAVE");
  BLEDevice::setMTU(512);

  // Create the BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create the BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create a BLE Characteristic (simplified)
  pCharacteristic = pService->createCharacteristic(
                      SLAVE_CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_INDICATE | BLECharacteristic::PROPERTY_NOTIFY
                    );

  // Start the service
  pService->start();

  // Start advertising (simplified)
  BLEDevice::getAdvertising()->addServiceUUID(SERVICE_UUID);
  BLEDevice::startAdvertising();
  Serial.println("BLE ready");


  // Set device as a Wi-Fi Station
  WiFi.mode(WIFI_STA);

  // Init ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error initializing ESP-NOW");
    return;
  }

  // Once ESPNow is successfully Init, we will register for Send CB to
  // get the status of Transmitted packet
  esp_now_register_send_cb(OnDataSent);
  
  // Register peer
  memcpy(peerInfo.peer_addr, broadcastAddress, 6);
  peerInfo.channel = 0;  
  peerInfo.encrypt = false;
  
  // Add peer        
  if (esp_now_add_peer(&peerInfo) != ESP_OK){
    Serial.println("Failed to add peer");
    return;
  }
  
  // Register for a callback function that will be called when data is received
  esp_now_register_recv_cb(OnDataRecv);
  
  Serial.println("ESP-NOW initialized successfully");
}
 
void loop() {

  imu::Quaternion quat = bno.getQuat();
  imu::Vector<3> linearAccel = bno.getVector(Adafruit_BNO055::VECTOR_LINEARACCEL);

  // Calculate and store acceleration magnitude for impact detection
  float accelMagnitude = sqrt(linearAccel.x()*linearAccel.x() + linearAccel.y()*linearAccel.y() + linearAccel.z()*linearAccel.z());
  accelBuffer[head] = accelMagnitude;

  // Debug: Print raw quaternion values every 50 loops (1 second)
  static int debugCounter = 0;
  if (++debugCounter % 50 == 0) {
    Serial.print("SLAVE Raw Quat W:"); Serial.print(quat.w(), 4);
    Serial.print(" X:"); Serial.print(quat.x(), 4);
    Serial.print(" Y:"); Serial.print(quat.y(), 4);
    Serial.print(" Z:"); Serial.print(quat.z(), 4);
    Serial.print(" | Norm:"); Serial.print(sqrt(quat.w()*quat.w() + quat.x()*quat.x() + quat.y()*quat.y() + quat.z()*quat.z()), 4);
    Serial.println();
  }

  // Only record data if recording is active
  if (recordingActive) {
    buffer[head] = quat;  // Store current reading
    head = (head + 1) % bufferSize;  // Move head pointer
  }

  //50hz
  delay(20);
}