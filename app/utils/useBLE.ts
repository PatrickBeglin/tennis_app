import * as ExpoDevice from "expo-device";
import { useEffect, useMemo, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { BleError, BleManager, Characteristic, Device } from "react-native-ble-plx";


const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"

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
        bleManager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
            if (error) {
                console.log("BLE Scan Error:", error);
            }
            if (device) {
                console.log("Found device:", device.name || "Unnamed", "ID:", device.id, "RSSI:", device.rssi);
                if (device.name) {
                    setAllDevices((prevState: Device[]) => {
                        if (!isDuplicateDevice(prevState, device)) {
                            console.log("Adding new device to list:", device.name);
                            return [...prevState, device];
                        } else {
                            console.log("Device already in list:", device.name);
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
            console.log(error);
            return;
        } else if (!characteristic?.value) {
            console.log("No Data was recieved");
            return;
        }

        const rawData = Buffer.from(characteristic.value, 'base64').toString();

        try {
            const tennisData = JSON.parse(rawData);
            console.log("Tennis Data:", tennisData);
            setSensorData(prev => ({
                ...prev,
                // use the device id as the key
                [tennisData.device_id]: tennisData // SEND DEVICE_ID FROM ESP32 
            }));
        } catch (e) {
            console.log("Error parsing tennis data:", e);
        }
    }

    

    const startStreamingData = async (device: Device) => {
        if (device) {
          device.monitorCharacteristicForService(
            SERVICE_UUID,
            CHARACTERISTIC_UUID,
            onTennisDataUpdate
          );
          console.log("Started streaming data from:", device.name);
        } else {
          console.log("No Device Connected");
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