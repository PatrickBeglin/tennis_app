#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLEServer* pServer = nullptr;
bool deviceConnected = false;
unsigned long lastAdvertisingCheck = 0;
const unsigned long ADVERTISING_CHECK_INTERVAL = 10000; // Check every 10 seconds

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("✅ Device connected!");
      Serial.println("📱 Phone app is now connected to ESP32");
    }
    
    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("❌ Device disconnected! Restarting advertising...");
      
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
      
      Serial.println("🔄 Advertising restarted - device should be discoverable again");
    }
};

void setup() {
  Serial.begin(115200);
  Serial.println("🚀 Starting BLE Server...");
  
  // Initialize BLE device
  BLEDevice::init("Long name works now");
  Serial.println("📱 Device name set to: Long name works now");
  
  // Create BLE server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  Serial.println("🔧 BLE Server created with callbacks");

  // Create BLE service
  BLEService *pService = pServer->createService(SERVICE_UUID);
  Serial.println("⚙️ BLE Service created");

  // Create BLE characteristic
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID, 
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE
  );
  pCharacteristic->setValue("Hello World says Neil");
  Serial.println("📊 BLE Characteristic created with data");

  // Start the service
  pService->start();
  Serial.println("✅ Service started");

  // Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  
  Serial.println("📡 Advertising started!");
  Serial.println("🔍 Device should now be discoverable by your phone app");
  Serial.println("📱 Look for 'Long name works now' in your device list");
}

void loop() {
  // Periodic status check and advertising verification
  if (millis() - lastAdvertisingCheck > ADVERTISING_CHECK_INTERVAL) {
    lastAdvertisingCheck = millis();
    
    if (!deviceConnected) {
      Serial.println("⏳ Waiting for connection... (Device is advertising)");
    } else {
      Serial.println("📊 Device is connected - ready for data exchange");
    }
  }
  
  delay(2000);
} 