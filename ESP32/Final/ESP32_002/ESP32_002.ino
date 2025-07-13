#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BNO055.h>
#include <utility/imumaths.h>

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// 50hz - reduced to prevent packet overlap
#define BNO055_SAMPLERATE_DELAY_MS (20)
Adafruit_BNO055 bno = Adafruit_BNO055(-1, 0x28, &Wire);

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

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
  Serial.println("go");
  delay(3000);  // Let USB settle
  Serial.println("✅ Serial is working");

  while (!Serial) delay(10);  // wait for serial port to open!

  Serial.println("Orientation Sensor Raw Data Test"); Serial.println("");

  /* Initialise the sensor */
  if(!bno.begin())
  {
    /* There was a problem detecting the BNO055 ... check your connections */
    Serial.print("Ooops, no BNO055 detected ... Check your wiring or I2C ADDR!");
  } else {
    Serial.println("BNO055 detected");
  }
  delay(1000);


  // Create the BLE Device
  BLEDevice::init("ESP32_002");
  BLEDevice::setMTU(512);

  // Create the BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create the BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create a BLE Characteristic
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_WRITE  |
                      BLECharacteristic::PROPERTY_INDICATE
                    );

  // Create a BLE Descriptor
  pCharacteristic->addDescriptor(new BLE2902());

  // Start the service
  pService->start();

  // Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);  // set value to 0x00 to not advertise this parameter
  BLEDevice::startAdvertising();
  Serial.println("Waiting a client connection to notify...");
}


static const int bufferSize = 400;
imu::Vector<3> buffer[bufferSize];
int head = 0;

bool swingActive = false;
int swingStartIndex = 0;
int swingEndIndex = 0;
unsigned long lastSwingTime = 0;  // Add cooldown tracking
const unsigned long SWING_COOLDOWN_MS = 2000;  // 2 second cooldown
const int MIN_SWING_DURATION = 5;  // Minimum 5 samples for a swing (reduced from 20)
int swingSampleCount = 0;  // Track samples during swing

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
  if (fabs(curr.x() - earlier.x()) > 100.0 ||
      fabs(curr.y() - earlier.y()) > 100.0 ||
      fabs(curr.z() - earlier.z()) > 100.0) {
    return true;
  }
  return false;
}

void sendSwingData(int startIndex, int endIndex) {
  // Only send if swing has enough samples
  int swingLength = (endIndex - startIndex + bufferSize) % bufferSize;
  if (swingLength < MIN_SWING_DURATION) {
    Serial.println("Swing too short, ignoring");
    return;
  }

  static uint8_t swingIdCounter = 0;
  uint8_t swingId = swingIdCounter++;
  
  int maxPoints = 82;
  int pointsToSend = min(swingLength, maxPoints); // cuts off long swings

  //create binary packet 500bytes
  uint8_t binaryData[500];
  int dataIndex = 0;

  binaryData[dataIndex++] = 0x02; // the id for master
  binaryData[dataIndex++] = swingId; // id for the swing
  binaryData[dataIndex++] = pointsToSend; // number of points to send

  // convert to binary
  int currentIndex = startIndex; // where to start reading from buffer
  int count = 0; // how many points weve processed

  // loops each data point in the swing and stops at endIndex
  while (count < pointsToSend && currentIndex != endIndex) {
    // Timestamp (2 bytes - milliseconds since swing start)
    unsigned long timestamp = count * 20; // 0, 20, 40, 60... ms at 50Hz
    binaryData[dataIndex++] = (timestamp >> 8) & 0xFF;  // High byte
    binaryData[dataIndex++] = timestamp & 0xFF;// Low byte
    
    // X, Y, Z values (3 bytes, signed)
    binaryData[dataIndex++] = (int8_t)buffer[currentIndex].x();
    binaryData[dataIndex++] = (int8_t)buffer[currentIndex].y();
    binaryData[dataIndex++] = (int8_t)buffer[currentIndex].z();
    
    currentIndex = (currentIndex + 1) % bufferSize;
    count++;
  }

  pCharacteristic->setValue(binaryData, dataIndex);
  pCharacteristic->indicate();
}


void loop() {
  // get sensor data
  imu::Vector<3> euler = bno.getVector(Adafruit_BNO055::VECTOR_EULER);

  buffer[head] = euler;  // Store current reading
  head = (head + 1) % bufferSize;  // Move head pointer

  if (swingDetected() && !swingActive) {
    Serial.println("Swing detected");
    swingActive = true;
    swingStartIndex = (head - 1 + bufferSize) % bufferSize; // Start at the position where swing was detected
    swingSampleCount = 0;  // Reset sample counter
  }

  if (swingActive) {
    swingSampleCount++;  // Count samples during swing
    
    if (!swingDetected()) {
      swingActive = false;
      swingEndIndex = (head - 1 + bufferSize) % bufferSize; // End at the position where swing ended
      lastSwingTime = millis();  // Set cooldown timer
      
      Serial.print("Swing ended. Duration: ");
      Serial.print(swingSampleCount);
      Serial.println(" samples");
      
      sendSwingData(swingStartIndex, swingEndIndex);
    }
  }


  // notify changed value
  if (deviceConnected) {
      //Serial.println("sending data");
      // pCharacteristic->setValue((uint8_t*)dataJson.c_str(), dataJson.length());
      //pCharacteristic->notify(); 
      delay(BNO055_SAMPLERATE_DELAY_MS);
  }
  // disconnecting
  if (!deviceConnected && oldDeviceConnected) {
      //Serial.println("disconnecting");
      delay(500); // give the bluetooth stack the chance to get things ready
      pServer->startAdvertising(); // restart advertising
      Serial.println("start advertising");
      oldDeviceConnected = deviceConnected;
  }
  // connecting
  if (deviceConnected && !oldDeviceConnected) {
      // do stuff here on connecting
      oldDeviceConnected = deviceConnected;
  }
}