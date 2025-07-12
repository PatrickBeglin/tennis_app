#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BNO055.h>
#include <utility/imumaths.h>
#include <Arduino.h>


// matching 10hz
#define BNO055_SAMPLERATE_DELAY_MS (100)

Adafruit_BNO055 bno = Adafruit_BNO055(-1, 0x28, &Wire);

// must match reactnative
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLEServer* pServer = nullptr;
bool deviceConnected = false;
// last advertising check is the last time the advertising was checked
unsigned long lastAdvertisingCheck = 0;
const unsigned long ADVERTISING_CHECK_INTERVAL = 10000; // Check every 10 seconds

// class for the server callbacks
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("Device connected");
      Serial.println("app is now connected to ESP32");
    }
    
    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("Device disconnected Restarting advertising");
      
      // Stop any existing advertising first
      BLEDevice::getAdvertising()->stop();
      delay(100);
      
      // Restart advertising
      BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
      pAdvertising->addServiceUUID(SERVICE_UUID);
      pAdvertising->setScanResponse(true);
      pAdvertising->setMinPreferred(0x06);
      pAdvertising->setMinPreferred(0x12);
      BLEDevice::startAdvertising();
      
      Serial.println("Advertising restarted - device should be discoverable again");
    }
};

BLECharacteristic* pCharacteristic = nullptr;

void setup() {
  // -------------------BLUETOOTH SETUP------------------- //
  Serial.begin(115200);
  Serial.println("Starting BLE Server...");
  
  // Initialize BLE device
  BLEDevice::init("Long name works now");
  Serial.println("Device name set to: Long name works now");
  
  // Create BLE server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  Serial.println("BLE Server created with callbacks");

  // Create BLE service
  BLEService *pService = pServer->createService(SERVICE_UUID);
  Serial.println("BLE Service created");

  // Create BLE characteristic
  BLECharacteristic pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID, 
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY //notify to send data to app
    // needed for notify
  );

  pCharacteristic->addDescriptor(new BLE2902());
  pCharacteristic->setValue("Hello World says Neil");
  Serial.println("BLE Characteristic created with data");

  // Start the service
  pService->start();
  Serial.println("Service started");

  // Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  
  Serial.println("Advertising started!");
  Serial.println("Device should now be discoverable by your phone app");
  Serial.println("Look for 'Long name works now' in your device list");


  // -------------------SENSOR SETUP------------------- //
  Wire.begin(22, 19);
  Serial.println("go");
  delay(3000);  // Let USB settle
  Serial.println("✅ Serial is working");


  Serial.println("Orientation Sensor Raw Data Test"); Serial.println("");

  /* Initialise the sensor */
  if(!bno.begin())
  {
    /* There was a problem detecting the BNO055 ... check your connections */
    Serial.print("Ooops, no BNO055 detected ... Check your wiring or I2C ADDR!");
    while(1);
  }

  delay(1000);

  /* Display the current temperature */
  int8_t temp = bno.getTemp();
  Serial.print("Current Temperature: ");
  Serial.print(temp);
  Serial.println(" C");
  Serial.println("");

  bno.setExtCrystalUse(true);
  Serial.println("Calibration status values: 0=uncalibrated, 3=fully calibrated");
}

void loop() {
  // -------------------BLUETOOTH LOOP------------------- //
  // Periodic status check and advertising verification
  if (millis() - lastAdvertisingCheck > ADVERTISING_CHECK_INTERVAL) {
    lastAdvertisingCheck = millis();
    
    if (!deviceConnected) {
      Serial.println("Waiting for connection... (Device is advertising)");
    } else {
      Serial.println("Device is connected - ready for data exchange");
    }
  }
  delay(2000);

  // -------------------SENSOR LOOP------------------- //
  // Possible vector values can be:
  // - VECTOR_ACCELEROMETER - m/s^2
  // - VECTOR_MAGNETOMETER  - uT
  // - VECTOR_GYROSCOPE     - rad/s
  // - VECTOR_EULER         - degrees
  // - VECTOR_LINEARACCEL   - m/s^2
  // - VECTOR_GRAVITY       - m/s^2
  imu::Vector<3> euler = bno.getVector(Adafruit_BNO055::VECTOR_EULER);

  /* Display the floating point data */
  Serial.print("X: ");
  Serial.print(euler.x());
  Serial.print(" Y: ");
  Serial.print(euler.y());
  Serial.print(" Z: ");
  Serial.print(euler.z());
  Serial.print("\t\t");

  /* Display calibration status for each sensor. */
  uint8_t system, gyro, accel, mag = 0;
  bno.getCalibration(&system, &gyro, &accel, &mag);
  Serial.print("CALIBRATION: Sys=");
  Serial.print(system, DEC);
  Serial.print(" Gyro=");
  Serial.print(gyro, DEC);
  Serial.print(" Accel=");
  Serial.print(accel, DEC);
  Serial.print(" Mag=");
  Serial.println(mag, DEC);

  delay(BNO055_SAMPLERATE_DELAY_MS);
} 
