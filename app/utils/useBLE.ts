import { Buffer } from "buffer";
import * as ExpoDevice from "expo-device";
import { useEffect, useMemo, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { BleError, BleManager, Characteristic, Device } from "react-native-ble-plx";


const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
const MASTER_CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"  // Master
const SLAVE_CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a9"   // Slave

// Global variable to store sensor data - accessible from anywhere
export let globalSensorData: {[deviceId: string]: any} = {};
console.log("USE BLE TEST Global sensor data:", globalSensorData);

// Function to update global sensor data
export const updateGlobalSensorData = (newData: {[deviceId: string]: any}) => {
    globalSensorData = { ...globalSensorData, ...newData };
};

interface BluetoothLowEnergyApi {
    requestPermissions(): Promise<boolean>;
    scanForPeripherals(): void;
    allDevices: Device[];
    stopDeviceScan(): void;
    connectToDevice(device: Device): Promise<void>;
    disconnectFromDevice(device: Device): Promise<void>;
    disconnectAllDevices(): Promise<void>;
    connectedDevices: Device[];
    isConnecting: boolean;
    maxConnections: number;
    sensorData: {[deviceId: string]: any};
}



function useBLE(): BluetoothLowEnergyApi {
    const bleManager = useMemo(()=> new BleManager(), []);

    const [allDevices, setAllDevices] = useState<Device[]>([]);
    const [connectedDevices, setConnectedDevices] = useState<Device[]>([]);
    const [isConnecting, setIsConnecting] = useState<boolean>(false);
    const maxConnections = 2; // Support for 2 ESP32s
    // Store sensor data for each device in a dictionary with device id as key and any data as value 
    // sensor data is a variable that stores the data from the tennis sensor
    // setsensordata is a function that sets the sensor data
    const [sensorData, setSensorData] = useState<{[deviceId: string]: any}>({}); // start with empty dictionary


    // Listen for unexpected disconnections
    useEffect(() => {
        console.log("Setting up disconnection listener...");
        const subscription = bleManager.onDeviceDisconnected(null as unknown as string, (device) => {
            console.log("Disconnection event received:", device);
            // Type guard: only proceed if device is a Device (not BleError)
            if (!device || (device as BleError).errorCode) {
                console.log("Disconnection event was an error, not a device");
                return;
            }
            const dev = device as unknown as Device;
            console.log(`Device ${dev.name} (${dev.id}) disconnected unexpectedly.`);
            setConnectedDevices(prev => {
                const filtered = prev.filter(d => d.id !== dev.id);
                console.log(`Updated connected devices: ${filtered.length} remaining`);
                return filtered;
            });
        });
        return () => {
            console.log("Cleaning up disconnection listener...");
            subscription.remove();
        };
    }, [bleManager]);

    // Periodic connection health check
    useEffect(() => {
        if (connectedDevices.length === 0) return;

        const interval = setInterval(async () => {
            console.log(`Checking connection health for ${connectedDevices.length} devices...`);
            for (const device of connectedDevices) {
                try {
                    // Check if device is still connected
                    const isConnected = await device.isConnected();
                    if (!isConnected) {
                        console.log(`Device ${device.name} is no longer connected, removing from list`);
                        setConnectedDevices(prev => prev.filter(d => d.id !== device.id));
                    }
                } catch (error) {
                    console.log(`Device ${device.name} is no longer reachable, removing from connected list`);
                    setConnectedDevices(prev => prev.filter(d => d.id !== device.id));
                }
            }
        }, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
    }, [connectedDevices]);

    const requestAndroidPermissions = async () => {
        const bluetoothScanPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            {
                title: "scan permisson",
                message: "app requires bluetooth scanning",
                buttonPositive: "OK",
            }
        )
        const bluetoothConnectPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            {
                title: "connect Permisson",
                message: "app requires bluetooth connection",
                buttonPositive: "OK",
            }
        )
        const bluetoothFineLocationPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: "Fine Location Permission",
                message: "App requires fine location permission",
                buttonPositive: "OK",
            }
        );
        return (
            bluetoothScanPermission === "granted" &&
            bluetoothConnectPermission === "granted" &&
            bluetoothFineLocationPermission === "granted"
        )
    };

    const requestPermissions = async () => {
        if(Platform.OS === "android") {
            if((ExpoDevice.platformApiLevel ?? -1) <31){
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: "Location Permission",
                        message: "App requires location permission",
                        buttonPositive: "OK",
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } else {
                const isAndroidPermissionGranted = await requestAndroidPermissions();
                return isAndroidPermissionGranted;
            }
        } else {
            return true;
        }
        
    }

/* return true if the device is already in the list */
    const isDuplicateDevice = (devices: Device[], device: Device) =>
        devices.findIndex((d) => d.id === device.id) > -1;

    /* scan for peripherals if permission is granted */
    const scanForPeripherals = () => {
        console.log("Starting BLE scan...");
        // only search for my esp32s
        bleManager.startDeviceScan(null, null, (error, device) => {
            if (error) {
                console.log("BLE Scan Error:", error);
            }
            if (device) {
                if (device.name) {
                    setAllDevices((prevState: Device[]) => {
                        if (!isDuplicateDevice(prevState, device)) {
                            return [...prevState, device];
                        } else {
                            return prevState;
                        }
                    });
                }
            }
        });
    }

    const stopDeviceScan = () => {
            bleManager.stopDeviceScan();
    }

    const connectToDevice = async (device: Device) => {
        // Check if we're already at max connections
        if (connectedDevices.length >= maxConnections) {
            console.log(`Cannot connect: Already connected to ${maxConnections} devices`);
            return;
        }
        
        // Check if device is already connected
        if (isDuplicateDevice(connectedDevices, device)) {
            console.log("Device already connected:", device.name);
            return;
        }

        // Check if we're already connecting
        if (isConnecting) {
            console.log("Already attempting a connection, please wait...");
            return;
        }

        setIsConnecting(true);
        try {
            console.log(`Attempting to connect to: ${device.name} (ID: ${device.id})`);
            console.log(`Current connections: ${connectedDevices.length}/${maxConnections}`);
            
            const connected = await bleManager.connectToDevice(device.id);
            if (!connected) {
                throw new Error('Connection failed: Device not found or not advertising');
            }
            console.log(`Successfully connected to: ${connected.name}`);
            
            // Request larger MTU for better data transfer
            try {
                await connected.requestMTU(512);
                console.log("MTU increased to 512 bytes");
            } catch (e) {
                console.log("Failed to increase MTU:", e);
            }
            
            setConnectedDevices(prev => [...prev, connected]);
            console.log(`Total connections: ${connectedDevices.length + 1}/${maxConnections}`);

            startStreamingData(connected);
            
        } catch (e) {
            console.log("Connection error:", e);
            // handle error
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectFromDevice = async (device: Device) => {
        try {
            console.log(`Disconnecting from: ${device.name}`);
            
            // First, check if the device is actually connected
            try {
                const isConnected = await device.isConnected();
                if (!isConnected) {
                    console.log(`Device ${device.name} is already disconnected, removing from list`);
                    setConnectedDevices(prev => prev.filter(d => d.id !== device.id));
                    return;
                }
            } catch (error) {
                console.log(`Device ${device.name} is not reachable, removing from list`);
                setConnectedDevices(prev => prev.filter(d => d.id !== device.id));
                return;
            }
            
            // Try to properly disconnect
            await bleManager.cancelDeviceConnection(device.id);
            setConnectedDevices(prev => prev.filter(d => d.id !== device.id));
            console.log(`Disconnected from: ${device.name}`);
        } catch (e) {
            console.log("Disconnection error:", e);
            // Even if the disconnect call fails, remove the device from our list
            // since it's clearly not connected anymore
            console.log(`Removing ${device.name} from connected list due to disconnect error`);
            setConnectedDevices(prev => prev.filter(d => d.id !== device.id));
        }
    };

    const disconnectAllDevices = async () => {
        console.log(`Disconnecting all ${connectedDevices.length} devices`);
        const devicesToDisconnect = [...connectedDevices]; // Create a copy to avoid mutation issues
        
        // Clear the connected devices list immediately
        setConnectedDevices([]);
        
        // Attempt to disconnect each device
        for (const device of devicesToDisconnect) {
            try {
                await bleManager.cancelDeviceConnection(device.id);
                console.log(`Disconnected from: ${device.name}`);
            } catch (e) {
                console.log(`Failed to disconnect from ${device.name}:`, e);
                // Device is already disconnected or unreachable
            }
        }
        console.log("All devices disconnected");
    };

    const onTennisDataUpdate = (
        error: BleError | null,
        characteristic: Characteristic | null
    ) => {
        if (error) {
            console.log("BLE Error:", error);
            return;
        } else if (!characteristic?.value) {
            console.log("No Data was received");
            return;
        }

        const rawData = Buffer.from(characteristic.value, 'base64');
        //console.log("Raw data length:", rawData.length);
        //console.log("Raw data:", rawData);

        try {
            const deviceId = rawData[0];

            if (deviceId === 0x02) {
                const tennisData = processBinaryData(rawData);
                console.log("MASTERTennis Data:", tennisData);

                setSensorData(prev => ({
                    ...prev,
                    [tennisData.device_id]: tennisData
                }));

                // Update global sensor data
                updateGlobalSensorData({
                    [tennisData.device_id]: tennisData
                });

            } else if (deviceId === 0x03) {
                const tennisData = processBinaryData(rawData);
                console.log("SLAVE Tennis Data:", tennisData);

                setSensorData(prev => ({
                    ...prev,
                    [tennisData.device_id]: tennisData
                }));

                // Update global sensor data
                updateGlobalSensorData({
                    [tennisData.device_id]: tennisData
                });
            } else {
                console.log("ERROR Unknown device ID:", deviceId);
            }
        } catch (e) {
            console.log("Error processing data:", e);
            console.log("Raw data that failed to parse:", rawData);
        }
    } 


    const processBinaryData = (buffer: Buffer) => { // buffer will be rawdata
        let offset = 0; // current position in the buffer

        const deviceId = buffer[offset++]; // reads byte 0 then 1 etc
        const swingId = buffer[offset++];
        const maxSpeed = buffer[offset++] / 2; // divide by 2 to get acc mph
        const pointsToSend = buffer[offset++];

        const swingData = [];

        for (let i = 0; i < pointsToSend; i++) {

            const x = buffer.readInt8(offset++);
            const y = buffer.readInt8(offset++);
            const z = buffer.readInt8(offset++);

            swingData.push({
                x: x,
                y: y,
                z: z,
            })
        }
        if (deviceId === 0x03) {
            return {
                device_id: "ESP32_SLAVE",
                swing_id: swingId,
                max_speed: maxSpeed,
                swing: swingData,

            }
        }
        else if (deviceId === 0x02) {
            return {
                device_id: "ESP32_MASTER",
                swing_id: swingId,
                max_speed: maxSpeed,
                swing: swingData,
            }
        }
        else {
            return {
                device_id: "UNKNOWN",
                swing_id: swingId,
                max_speed: maxSpeed,
                swing: swingData,
            }
        }
        
    }



    const startStreamingData = async (device: Device) => {
        if (device) {
            try {
                console.log("🔍 Discovering services...");
                const discoveredDevice = await device.discoverAllServicesAndCharacteristics();
                console.log("✅ Services discovered");
                
                // Monitor based on device name
                if (device.id.includes("E8:6B:EA:2F:E8:0A")) {
                    const subscription = discoveredDevice.monitorCharacteristicForService(
                        SERVICE_UUID,
                        MASTER_CHARACTERISTIC_UUID,
                        onTennisDataUpdate,
                        'indication'
                    );
                    console.log("✅ Started streaming MASTER data from:", device.name);
                } else if (device.id.includes("E8:6B:EA:2F:E8:4A")) {
                    const subscription = discoveredDevice.monitorCharacteristicForService(
                        SERVICE_UUID,
                        SLAVE_CHARACTERISTIC_UUID,
                        onTennisDataUpdate,
                        'notification'
                    );
                    console.log("✅ Started streaming SLAVE data from:", device.name);
                }
            } catch (error) {
                console.log("❌ Error starting streaming:", error);
            }
        } else {
            console.log("No device to start streaming from");
        }
    };


    return {
        scanForPeripherals,
        requestPermissions,
        allDevices,
        stopDeviceScan,
        connectToDevice,
        disconnectFromDevice,
        disconnectAllDevices,
        connectedDevices,
        isConnecting,
        maxConnections,
        sensorData,
    }
}



export default useBLE;



