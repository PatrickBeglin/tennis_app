OVERVIEW
--------
A React Native companion mobile application built with Expo that tracks tennis serves using two
ESP32s connected via Bluetooth Low Energy (BLE) providing insights into users tennis serve form.

FEATURES
--------
- Real-time serve tracking using BNO055 sensors
- Data visualisation 

TECHNICAL STACK
---------
- Frontend: React Native with Expo
- Navigation: Expo Router
- Bluetooth: React Native BLE PLX
- Language: TypeScript

PREREQUISITES
---------
- Node.js
- npm or yarn package manager
- Expo CLI
- Android smartphone or emulator

INSTALLATION
---------

1. Clone the repository:
   git clone [repository-url]
   cd tennis

2. Install dependencies:
   npm install

3. Install Expo CLI globally:
   npm install -g @expo/cli

EXECUTION
---------
1. With an android smartphone run:
   npx expo run:android

HARDWARE SETUP
---------

1. ESP32 Sensor Configuration:
   - plug ESP32s in and open Arduino IDE
   - Upload code from ESP_MASTER and ESP_SLAVE
   - Power sensors via USB or battery

USER MANUAL
---------
Charging the device:
1.	Locate the USB-C charging module inside each sweat band.
2.	Connect it to a USB power source.
3.	Charge until the charging module’s indicator light turns green.

Using the device:
1.	Power on: Plug the LiPo battery into the charging module inside each sweat band. A green light on the module confirms the device is powered.
2.	Identify each band using the labels (“ARM” and “WRIST”)
3.	Fit the Upper Arm Band first:	
	    - Arrow points up your arm.“UP”
	label should face outwards.
4.	Fit the Wrist Band:	
	    - Arrow points up your arm.“UP”
	    - label should face outwards.
5.	Open the app and tap the Bluetooth connect button (top right of the home screen).
6.	Connect to both devices: ESP_SLAVE and ESP_MASTER.
7.	Select Serve Mode and follow the on-screen calibration instructions.
8.	You’re now ready to start serving and receiving feedback through the app!

Powering off:
1.	Unplug the LiPo battery from the charging module inside each sweat band.

SUPPORT
----------

If you have any issues please contact me at pb233@st-andrews.ac.uk

