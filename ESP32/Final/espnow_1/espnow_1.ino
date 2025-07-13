#include <esp_now.h>
#include <WiFi.h>

// MAC Address of the master ESP32
uint8_t broadcastAddress[] = {0xE8, 0x6B, 0xEA, 0x2F, 0xE8, 0x08}; 
Adafruit_BNO055 bno = Adafruit_BNO055(-1, 0x28, &Wire);

static const int bufferSize = 400;
imu::Vector<3> buffer[bufferSize];
int head = 0;
bool recordingActive = false;


// Variable to store if sending data was successful
String success;

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
void OnDataRecv(const uint8_t * mac, const uint8_t *incomingData, int len) {
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
  Serial.println("Recording started");
}

void sendData(uint8_t swingId, uint8_t pointsToSend) {
  // Create binary packet
  uint8_t binaryData[250]; // ESP-NOW limit
  int dataIndex = 0;

  binaryData[dataIndex++] = 0x03; // Slave device ID
  binaryData[dataIndex++] = swingId; // Swing ID from master
  
  // Limit points to send based on available data and ESP-NOW limit
  int actualPointsToSend = min(min(pointsToSend, head), 82);
  binaryData[dataIndex++] = actualPointsToSend; // Number of points

  // Send data starting from index 0 (since we reset the buffer)
  for (int i = 0; i < actualPointsToSend; i++) {
    // Timestamp (2 bytes - milliseconds since recording start)
    unsigned long timestamp = i * 20; // 0, 20, 40, 60... ms at 50Hz
    binaryData[dataIndex++] = (timestamp >> 8) & 0xFF;  // High byte
    binaryData[dataIndex++] = timestamp & 0xFF; // Low byte
    
    // X, Y, Z values (3 bytes, signed)
    binaryData[dataIndex++] = (int8_t)buffer[i].x();
    binaryData[dataIndex++] = (int8_t)buffer[i].y();
    binaryData[dataIndex++] = (int8_t)buffer[i].z();
  }

  // Send via ESP-NOW
  esp_err_t result = esp_now_send(broadcastAddress, binaryData, dataIndex);
  if (result == ESP_OK) {
    Serial.println("Data sent successfully");
  } else {
    Serial.println("Error sending data");
  }
}


 
void setup() {
  Wire.begin(22, 19);
  Serial.begin(115200);
  Serial.println("go");
  delay(3000);  // Let USB settle
  Serial.println("✅ Serial is working");
  while (!Serial) delay(10);
  
  if(!bno.begin())
  {
    Serial.print("no BNO055 detected");
  } else {
    Serial.println("BNO055 detected");
  }
  delay(1000);

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

  buffer[head] = euler;  // Store current reading
  head = (head + 1) % bufferSize;  // Move head pointer

  //50hz
  delay(20);
}