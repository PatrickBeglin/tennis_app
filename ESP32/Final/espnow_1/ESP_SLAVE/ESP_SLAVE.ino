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
imu::Vector<3> buffer[bufferSize];
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
    buffer[i] = imu::Vector<3>(0, 0, 0);
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
  int actualPointsToSend = min(min((int)pointsToSend, head), 82);
  binaryData[dataIndex++] = actualPointsToSend; // Number of points
  
  Serial.print("Slave has ");
  Serial.print(head);
  Serial.print(" points, requested ");
  Serial.print(pointsToSend);
  Serial.print(", sending ");
  Serial.print(actualPointsToSend);
  Serial.println(" points");

  // Send data starting from index 0 (since we reset the buffer)
  for (int i = 0; i < actualPointsToSend; i++) {
    
    // X, Y, Z values (3 bytes, signed)
    binaryData[dataIndex++] = (int8_t)buffer[i].x();
    binaryData[dataIndex++] = (int8_t)buffer[i].y();
    binaryData[dataIndex++] = (int8_t)buffer[i].z();
  }

  // Send via ble to phone
  delay(200); // Reduced delay to prevent interference with other esp
  Serial.print("Sending BLE data: ");
  Serial.print(dataIndex);
  Serial.println(" bytes");
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

  imu::Vector<3> euler = bno.getVector(Adafruit_BNO055::VECTOR_EULER);

  // Only record data if recording is active
  if (recordingActive) {
    buffer[head] = euler;  // Store current reading
    head = (head + 1) % bufferSize;  // Move head pointer
  }

  //50hz
  delay(20);
}