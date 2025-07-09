import { Ionicons } from "@expo/vector-icons";
import React, { FC, useCallback } from "react";
import {
    FlatList,
    ListRenderItemInfo,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Device } from "react-native-ble-plx";
import colors from "../colors";
import spacing from "../spacing";

type DeviceModalProps = {
  devices: Device[];
  visible: boolean;
  connectToPeripheral: (device: Device) => void;
  disconnectFromPeripheral: (device: Device) => void;
  disconnectAllDevices?: () => void;
  closeModal: () => void;
  connectedDevices: Device[];
  maxConnections: number;
  isConnecting: boolean;
};

const DeviceModal: FC<DeviceModalProps> = ({
  devices,
  visible,
  connectToPeripheral,
  disconnectFromPeripheral,
  disconnectAllDevices,
  closeModal,
  connectedDevices,
  maxConnections,
  isConnecting,
}) => {
  // Debug logging for connectedDevices changes
  console.log("BLE_overlay render - connectedDevices:", connectedDevices.length, connectedDevices.map(d => d.name));

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Device>) => {
      const isConnected = connectedDevices.some(d => d.id === item.id);
      const isAtMaxConnections = connectedDevices.length >= maxConnections && !isConnected;
      const handlePress = () => {
        if (isConnected) {
          disconnectFromPeripheral(item);
        } else if (!isAtMaxConnections) {
          connectToPeripheral(item);
        }
      };
      
      const handleLongPress = () => {
        if (isConnected) {
          // Force disconnect by calling disconnect multiple times
          console.log(`Force disconnecting ${item.name}`);
          disconnectFromPeripheral(item);
          // Add a small delay and try again to ensure it's removed
          setTimeout(() => {
            disconnectFromPeripheral(item);
          }, 100);
        }
      };
      return (
        <TouchableOpacity
          style={[
            styles.deviceCard,
            isConnected && styles.deviceCardConnected,
            isAtMaxConnections && !isConnected && styles.deviceCardDisabled
          ]}
          onPress={handlePress}
          onLongPress={handleLongPress}
          activeOpacity={isAtMaxConnections && !isConnected ? 1 : 0.8}
          disabled={isAtMaxConnections && !isConnected || isConnecting}
        >
          <View style={styles.deviceInfo}>
            <Text style={[
              styles.deviceText,
              isConnected && styles.deviceTextConnected,
              isAtMaxConnections && !isConnected && styles.deviceTextDisabled
            ]}>
              {item.name || "Unnamed Device"}
            </Text>
            {isConnected && (
              <Text style={styles.connectedStatus}>Connected (Tap to disconnect, long press to force)</Text>
            )}
            {isAtMaxConnections && !isConnected && (
              <Text style={styles.maxConnectionsStatus}>Max connections reached</Text>
            )}
          </View>
          <Ionicons 
            name={isConnected ? "checkmark-circle" : "chevron-forward"} 
            size={24} 
            color={isConnected ? "#4CAF50" : isAtMaxConnections ? "#666666" : "white"} 
          />
        </TouchableOpacity>
      );
    },
    [connectToPeripheral, disconnectFromPeripheral, connectedDevices, maxConnections, isConnecting]
  );

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* Title and Close Button Row */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>Bluetooth Devices</Text>
            <View style={styles.headerButtons}>
              {connectedDevices.length > 0 && disconnectAllDevices && (
                <TouchableOpacity 
                  style={styles.clearButton} 
                  onPress={() => {
                    console.log("Clearing all connections");
                    disconnectAllDevices();
                  }}
                >
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          {/* Device List */}
          <FlatList
            data={devices}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,1)", // solid black background
    alignItems: "center",
  },
  modalBox: {
    borderRadius: 16,
    backgroundColor: "black",
    paddingTop: spacing.m * 1.5,
    paddingBottom: spacing.m,
    paddingHorizontal: 28,
    minHeight: 400,
    maxHeight: "90%",
    alignItems: "stretch",
    position: "relative",
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.m,
    paddingBottom: spacing.l,
    backgroundColor: 'black',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  clearButtonText: {
    color: 'white',
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontFamily: 'Inter-Bold',
    color: 'white',
    fontSize: 24,
    marginTop: 0,
    marginBottom: 0,
  },
  listContent: {
    paddingBottom: spacing.m,
  },
  deviceCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.l,
    marginBottom: spacing.m,
  },
  deviceCardConnected: {
    borderColor: "#4CAF50",
    borderWidth: 2,
  },
  deviceCardDisabled: {
    opacity: 0.5,
  },
  deviceInfo: {
    flex: 1,
    marginRight: spacing.l,
  },
  deviceText: {
    fontFamily: 'Inter-Regular',
    color: 'white',
    fontSize: 16,
  },
  deviceTextConnected: {
    fontFamily: 'Inter-Medium',
    color: "white",
  },
  deviceTextDisabled: {
    color: "#666666",
  },
  connectedStatus: {
    fontFamily: 'Inter-Regular',
    color: colors.accentText,
    fontSize: 12,
    marginTop: spacing.s,
  },
  maxConnectionsStatus: {
    fontFamily: 'Inter-Regular',
    color: "#666666",
    fontSize: 12,
    marginTop: spacing.s,
  },
});

export default DeviceModal;