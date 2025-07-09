import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import color from '../colors';
import spacing from '../spacing';

import ScoreRings from '../components/score_rings';
import { AVERAGE_SCORES } from '../data/average_scores';

import { StatBarsList } from "../components/stat_bar_list";
import { StatTotals } from "../components/stat_totals";
import { serveData } from "../data/serve_scores";

import { Alert } from "react-native";
import useBLE from "../utils/useBLE";

import DeviceModal from "../components/BLE_overlay";


export default function Index() {
  
  const { requestPermissions, scanForPeripherals, allDevices, stopDeviceScan, connectToDevice, disconnectFromDevice, disconnectAllDevices, connectedDevices, isConnecting, maxConnections } = useBLE();
  const [isModalVisible, setModalVisible] = useState<boolean>(false);

  // Debug logging for connectedDevices changes
  console.log("Index render - connectedDevices:", connectedDevices.length, connectedDevices.map(d => d.name));

  const handleConnect = async () => {
    const granted = await requestPermissions();
    console.log("granted", granted);
    if(granted) {
      stopDeviceScan();
      scanForPeripherals();
    } else {
      Alert.alert("Permission Denied", "Please enable location permission to scan for peripherals");
    }
  }

  const hideModal = () => {
    setModalVisible(false);
  }

  const showModal = () => {
    handleConnect();
    setModalVisible(true);
  }

  // Get connection status text
  const getConnectionStatus = () => {
    console.log("getConnectionStatus called - connectedDevices:", connectedDevices.length);
    if (connectedDevices.length === 0) {
      return "Connect";
    } else if (connectedDevices.length === maxConnections) {
      return `Connected (${connectedDevices.length}/${maxConnections})`;
    } else {
      return `Connect (${connectedDevices.length}/${maxConnections})`;
    }
  }
  
  return (
    <View style={styles.screen}>
      <View style = {styles.header}>
        <View style={styles.profile}>
          <View style={styles.avatar} />
          <Text style={styles.name}>Patrick</Text>
        </View>

        <TouchableOpacity 
          style={[
            styles.connectButton
          ]}
          onPress={showModal}
          disabled={isConnecting}
        >
          <Ionicons 
            name="bluetooth" 
            size={18} 
            color={connectedDevices.length > 0 ? "#4CAF50" : "white"}
          />
          <Text style={[
            styles.connectText,
            connectedDevices.length > 0 && styles.connectTextConnected
          ]}>
            {isConnecting ? "Connecting..." : getConnectionStatus()}
          </Text>
        </TouchableOpacity>

        <DeviceModal
          closeModal={hideModal}
          visible={isModalVisible}
          connectToPeripheral={connectToDevice}
          disconnectFromPeripheral={disconnectFromDevice}
          disconnectAllDevices={disconnectAllDevices}
          devices={allDevices}
          connectedDevices={connectedDevices}
          maxConnections={maxConnections}
          isConnecting={isConnecting}
      />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Play now</Text>

        <View style={styles.cardRow}>
          <View style={styles.cardL}>
            <View style={styles.imagePlaceholder} />
            <Text style={styles.cardTitleL}>General Mode</Text>
            <Text style={styles.cardDescription}>Play continuously and track metrics across your serve, forehand and backhand</Text>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Start Session</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardR}>
            <View style={styles.imagePlaceholder} />
            <Text style={styles.cardTitleR}>Serve Mode</Text>
            <Text style={styles.cardDescription}>Gather instant feedback on your serve</Text>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Start Session</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.doubleTitle}>
          <Text style={styles.sectionTitle}>Average Scores</Text>
          <Text style={styles.showMore}>Show more</Text>
        </View>
        <ScoreRings data={AVERAGE_SCORES} size={80} width={12} />
        <View style={styles.doubleTitle}>
          <Text style={styles.sectionTitle}>Last Session</Text>
          <Text style={styles.showMore}>Show more</Text>
        </View>
        <View style={styles.mainCard}>
        <StatTotals data={serveData} />
        <StatBarsList data={serveData} />
        </View>
      </ScrollView>
  </View>
  );
}


const styles = StyleSheet.create({
  header: {
    width: '100%',
    paddingHorizontal: 28,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'black', 
  },

  profile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#343335',
    marginRight: 12,
  },

  name: {
    fontFamily: 'Inter-Regular',
    color: 'white',
    fontSize: 14,
  },

  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.cardLight,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
  },

  connectText: {
    color: 'white',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginLeft: 8,
  },

  connectTextConnected: {
    color: 'white',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginLeft: 8,
  },

  screen: {
    flex: 1,
    backgroundColor: "black",
  },







  scroll: {
    flex: 1,
    backgroundColor: "black",
  },

  container: {
    paddingHorizontal: 28,
    paddingBottom: spacing.m,
  },

  sectionTitle: {
    color: "white",
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: spacing.m,
  },

  cardRow: {
    flexDirection: "row",
    marginBottom: spacing.l,
    alignItems: "stretch",
  },

  cardL: {
    marginRight: "2%",
    backgroundColor: color.card,
    borderRadius: 12,
    padding: 12,
    width: "49%",
    borderWidth: 0.5,
    borderColor: color.purple, // placeholder for gradient effect
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },

    cardR: {
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    padding: 12,
    width: "49%",
    borderWidth: 0.5,
    borderColor: color.blue, // placeholder for gradient effect
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },

  imagePlaceholder: {
    aspectRatio: 1,
    width: '100%',
    backgroundColor: color.cardLight,
    borderRadius: 6,
    marginBottom: 16,
  },

  cardTitleR: {
    fontFamily: 'Inter-Medium',
    color: color.blue,
    fontSize: 16,
    marginBottom: 2,
  },

  cardTitleL: {
    fontFamily: 'Inter-Medium',
    color: color.purple,
    fontSize: 16,
    marginBottom: 2,
  },

  cardDescription: {
    fontFamily: 'Inter-Regular',
    color: color.accentText,
    fontSize: 12,
    marginBottom: 16,
  },

  button: {
    borderColor: "#aaa",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 4,
    marginTop: 'auto', 
  },

  buttonText: {
    fontFamily: "Inter-Bold",
    color: "white",
    fontSize: 14,
  },

  doubleTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline'
  },

  showMore: {
    fontSize: 14,
    color: color.purple,
  },

  mainCard: {
    borderRadius: 12,
    paddingTop: spacing.m,
    paddingHorizontal: spacing.m,
    backgroundColor: color.card,
  }

})