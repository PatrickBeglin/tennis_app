import { Buffer } from "buffer";
import * as ExpoDevice from "expo-device";
import React, { useEffect, useMemo, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { BleError, BleManager, Characteristic, Device } from "react-native-ble-plx";


const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
const MASTER_CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"  // Master
const SLAVE_CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a9"   // Slave

// Global variable to store sensor data - accessible from anywhere
export let globalSensorData: {[deviceId: string]: any} = {};
console.log("globalSensorData:", globalSensorData);

// Function to update global sensor data
export const updateGlobalSensorData = (newData: {[deviceId: string]: any}) => {
    globalSensorData = { ...globalSensorData, ...newData };
    //console.log("dataaaaaaaaaaaaa:", globalSensorData);
};

// Global BLE context for sharing state across components
const BLEContext = React.createContext<BluetoothLowEnergyApi | null>(null);

// Global variable to store the BLE instance
let globalBLEInstance: BluetoothLowEnergyApi | null = null;

// Hook to use the global BLE context
export const useGlobalBLE = () => {
    const context = React.useContext(BLEContext);
    if (!context) {
        throw new Error('useGlobalBLE must be used within a BLEProvider');
    }
    return context;
};

// Provider component
export const BLEProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const bleApi = useBLE();

    // Store the instance globally
    globalBLEInstance = bleApi;

    return React.createElement(BLEContext.Provider, { value: bleApi }, children);
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
    sendPingToMaster: (data: string) => Promise<void>;
    refreshConnections: () => Promise<Device[]>;
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
                    console.log(`Device ${device.name} (${device.id}) connection status: ${isConnected}`);
                    if (!isConnected) {
                        console.log(`Device ${device.name} is no longer connected, removing from list`);
                        setConnectedDevices(prev => prev.filter(d => d.id !== device.id));
                    }
                } catch (error) {
                    console.log(`Device ${device.name} connection check failed:`, error);
                    // Don't immediately remove the device on error - it might be a temporary issue
                    // Only remove if we get multiple consecutive errors
                    console.log(`Device ${device.name} connection check failed, but keeping in list for now`);
                }
            }
        }, 10000); // Check every 10 seconds instead of 5

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
        
    };

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
    };

    const stopDeviceScan = () => {
            bleManager.stopDeviceScan();
    };

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
            
            setConnectedDevices(prev => {
                const newList = [...prev, connected];
                console.log(`Device added to connectedDevices. New count: ${newList.length}`);
                console.log("Connected devices:", newList.map(d => ({ name: d.name, id: d.id })));
                return newList;
            });
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
                //console.log("MASTERTennis Data:", tennisData);

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
                //console.log("SLAVE Tennis Data:", tennisData);

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
    } ;


    const processBinaryData = (buffer: Buffer) => { // buffer will be rawdata
        let offset = 0; // current position in the buffer

        const deviceId = buffer[offset++]; // reads byte 0 then 1 etc
        const swingId = buffer[offset++];
        const maxSpeed = (buffer[offset++] / 255.0) * 180.0; // Convert from 0-255 range back to 0-180 mph
        const pointsToSend = buffer[offset++];
        const impactIndex = buffer[offset++];
        const pronationSpeed = (buffer[offset++] * 15.625) - 2000; // Convert back to gyro reading (°/s)
        const impactEulerY = (buffer[offset++] * 360.0 / 255.0); // Convert back to Euler Y angle (0-255 mapped to 0-360°)
        const pronation = buffer[offset++] / 255.0 * 360.0; // pronation data

        const swingData = [];

        for (let i = 0; i < pointsToSend; i++) {
            if (deviceId === 0x03) {
                // Slave sends pronation data as individual bytes
                const pronationValue = buffer[offset++] / 255.0 * 360.0; // Convert from 0-255 to 0-360 degrees
                swingData.push(pronationValue);
            } else {
                // Master sends quaternion data (12-bit packed) - placeholder for now
                // Since we're not using quaternions anymore, just skip the data
                offset += 5; // Skip 5 bytes of quaternion data
                swingData.push(0); // Placeholder value
            }
        }
        if (deviceId === 0x03) {
            return {
                device_id: "ESP32_SLAVE",
                swing_id: swingId,
                max_speed: maxSpeed,
                impact_index: impactIndex,
                pronation_speed: pronationSpeed,
                impact_euler_y: impactEulerY,
                pronation: pronation,
                swing: swingData,

            }
        }
        else if (deviceId === 0x02) {
            return {
                device_id: "ESP32_MASTER",
                swing_id: swingId,
                max_speed: maxSpeed,
                impact_index: impactIndex,
                pronation_speed: pronationSpeed,
                impact_euler_y: impactEulerY,
                pronation: pronation,
                swing: swingData,
            }
        }
        else {
            return {
                device_id: "UNKNOWN",
                swing_id: swingId,
                max_speed: maxSpeed,
                impact_index: impactIndex,
                pronation_speed: pronationSpeed,
                impact_euler_y: impactEulerY,
                pronation: pronation,
                swing: swingData,
            }
        }  
    };

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

    const sendPingToMaster = async (data: string) => {
        console.log("=== sendPingToMaster Debug ===");
        
        // First try with current connected devices
        let currentConnected = [...connectedDevices];
        console.log("Initial connected devices count:", currentConnected.length);
        console.log("Initial connected devices:", currentConnected.map(d => ({ name: d.name, id: d.id })));
        
        // If no devices found, try refreshing connections
        if (currentConnected.length === 0) {
            console.log("No devices in current list, refreshing connections...");
            currentConnected = await refreshConnections();
        }
        
        console.log("Final connected devices count:", currentConnected.length);
        console.log("Final connected devices:", currentConnected.map(d => ({ name: d.name, id: d.id })));
        
        // More precise device detection - prioritize ID matching over name matching
        console.log("Searching for devices with specific IDs...");
        const masterDevice = currentConnected.find(device => {
            const idMatch = device.id.includes("E8:6B:EA:2F:E8:0A");
            console.log(`Checking device ${device.name} (${device.id}) for master: ID match=${idMatch}`);
            return idMatch;
        });
        
        const slaveDevice = currentConnected.find(device => {
            const idMatch = device.id.includes("E8:6B:EA:2F:E8:4A");
            console.log(`Checking device ${device.name} (${device.id}) for slave: ID match=${idMatch}`);
            return idMatch;
        });
        
        console.log("Looking for master device with ID containing: E8:6B:EA:2F:E8:0A");
        console.log("Looking for slave device with ID containing: E8:6B:EA:2F:E8:4A");
        
        if (masterDevice) {
            console.log("Found master device:", masterDevice.name, "ID:", masterDevice.id);
        } else {
            console.log("Master device not found");
        }
        
        if (slaveDevice) {
            console.log("Found slave device:", slaveDevice.name, "ID:", slaveDevice.id);
        } else {
            console.log("Slave device not found");
        }
        
        // If no specific devices found, try to send to any connected device
        if (!masterDevice && !slaveDevice && currentConnected.length > 0) {
            console.log("No specific master/slave devices found, trying to send to any connected device");
            const anyDevice = currentConnected[0];
            console.log("Attempting to send to:", anyDevice.name, "ID:", anyDevice.id);
            
            try {
                const discoveredDevice = await anyDevice.discoverAllServicesAndCharacteristics();
                
                // Try both characteristics
                try {
                    await discoveredDevice.writeCharacteristicWithResponseForService(
                        SERVICE_UUID,
                        MASTER_CHARACTERISTIC_UUID,
                        data
                    );
                    console.log("Ping sent to any device via master characteristic successfully");
                    return;
                } catch (error) {
                    console.log("Failed to send via master characteristic, trying slave characteristic");
                    await discoveredDevice.writeCharacteristicWithResponseForService(
                        SERVICE_UUID,
                        SLAVE_CHARACTERISTIC_UUID,
                        data
                    );
                    console.log("Ping sent to any device via slave characteristic successfully");
                    return;
                }
            } catch (error) {
                console.log("Failed to send ping to any device:", error);
            }
        }
        
        // Try to send to both master and slave devices
        let pingSent = false;
        
        // Send to master device if found
        if (masterDevice) {
            try {
                console.log("Sending ping to master device:", masterDevice.name);
                const discoveredDevice = await masterDevice.discoverAllServicesAndCharacteristics();
                
                await discoveredDevice.writeCharacteristicWithResponseForService(
                    SERVICE_UUID,
                    MASTER_CHARACTERISTIC_UUID,
                    data
                );
                console.log("✅ Ping sent to master successfully");
                pingSent = true;
            } catch (error) {
                console.log("❌ Failed to send ping to master:", error);
            }
        }
        
        // Send to slave device if found
        if (slaveDevice) {
            try {
                console.log("Sending ping to slave device:", slaveDevice.name);
                const discoveredDevice = await slaveDevice.discoverAllServicesAndCharacteristics();
                
                await discoveredDevice.writeCharacteristicWithResponseForService(
                    SERVICE_UUID,
                    SLAVE_CHARACTERISTIC_UUID,
                    data
                );
                console.log("✅ Ping sent to slave successfully");
                pingSent = true;
            } catch (error) {
                console.log("❌ Failed to send ping to slave:", error);
            }
        }
        
        if (!pingSent) {
            console.log("❌ Failed to send ping to any device");
            throw new Error("No devices available for ping");
        }
        
        console.log("✅ Ping sent to at least one device successfully");
    };

    const refreshConnections = async () => {
        console.log("Refreshing connections...");
        const currentConnected = [...connectedDevices];
        const stillConnected: Device[] = [];
        
        console.log(`Checking ${currentConnected.length} devices for connection status...`);
        
        for (const device of currentConnected) {
            try {
                console.log(`Checking connection for ${device.name} (${device.id})...`);
                const isConnected = await device.isConnected();
                console.log(`Device ${device.name} connection status: ${isConnected}`);
                
                if (isConnected) {
                    stillConnected.push(device);
                    console.log(`✅ Device ${device.name} is still connected`);
                } else {
                    console.log(`❌ Device ${device.name} is no longer connected, removing from list.`);
                }
            } catch (error) {
                console.log(`⚠️ Failed to check connection for ${device.name} (${device.id}):`, error);
                // If we can't check the connection, assume it's still connected rather than removing it
                // This prevents false removals due to temporary BLE issues
                stillConnected.push(device);
                console.log(`✅ Keeping ${device.name} in list despite connection check error`);
            }
        }
        
        // Only update state if we actually found disconnected devices
        if (stillConnected.length !== currentConnected.length) {
            console.log(`Updating connected devices: ${currentConnected.length} -> ${stillConnected.length}`);
            setConnectedDevices(stillConnected);
        } else {
            console.log(`No changes needed: ${stillConnected.length} devices still connected`);
        }
        
        console.log("Connection refresh complete. Still connected:", stillConnected.length);
        
        return stillConnected;
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
        sendPingToMaster,
        refreshConnections,
    }
}



export default useBLE;




