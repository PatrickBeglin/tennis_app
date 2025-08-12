// serveMode.tsx: serve mode screen
export const options = {
    headerShown: false,
  };

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import color from "./colors";
import CalibrateModal from "./components/calibrateModal";
import { PostServe } from "./components/postServe";
import SaveSessionModal from "./components/SaveSessionModal";
import StatGrid from "./components/statGrid";
import { StatTotals } from "./components/statTotals";
import { GridScore } from "./data/gridAverageScores";
import { getCurrentGridScores, processLiveData, resetData } from './data/liveDataProcessing';
import spacing from "./spacing";

export default function AboutScreen() {
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [isCalibrateModalVisible, setIsCalibrateModalVisible] = useState(true);
  const [swingData, setSwingData] = useState<any[]>([]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const newData = processLiveData();
      if (newData.length > 0) { // Only update if there's new data
        setSwingData(newData);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // added fallback objects with default values
  const wristData = swingData[0] || {
    title: 'Wrist Pronation',
    value: '0°',
    delta: '0°',
    avg: '0°',
    best: '0°',
    score: '0',
    label: ['0°', '180°'],
    proRange: '80° - 120°',
    tip: 'No data available',
    status: 'No Data',
    statusColor: '#666666',
    sliderValue: 0.5
  };
  const speedData = swingData[1] || {
    title: 'Swing Speed',
    value: '0',
    delta: '0',
    avg: '0',
    best: '0',
    score: '0',
    label: ['20mph', '150mph'],
    proRange: '85+ mph',
    tip: 'No data available',
    status: 'No Data',
    statusColor: '#666666',
    sliderValue: 0.5
  };
  const pronationSpeedData = swingData[2] || {
    title: 'Pronation Speed',
    value: '0',
    delta: '0',
    avg: '0',
    best: '0',
    score: '0',
    label: ['0°/s', '1000°/s'],
    proRange: '500+°/s',
    tip: 'No data available',
    status: 'No Data',
    statusColor: '#666666',
    sliderValue: 0.5
  };
  const contactYEulerData = swingData[3] || {
    title: 'Contact Angle',
    value: '0°',
    delta: '0°',
    avg: '0°',
    best: '0°',
    score: '0',
    label: ['0°', '180°'],
    proRange: '80° - 120°',
    tip: 'No data available',
    status: 'No Data',
    statusColor: '#666666',
    sliderValue: 0.5
  };
  const contactPronationData = swingData[4] || {
    title: 'Contact Pronation',
    value: '0°',
    delta: '0°',
    avg: '0°',
    best: '0°',
    score: '0',
    label: ['0°', '180°'],
    proRange: '80° - 120°',
    tip: 'No data available',
    status: 'No Data',
    statusColor: '#666666',
    sliderValue: 0.5
  };
  
  // Extract session summary data
  const sessionSummaryData = swingData[5] || {
    title: 'Session Summary',
    timePlayed: "0mins",
    totalServes: 0,
    totalScore: 0
  };

  const handleFinishPress = () => {
    setIsSaveModalVisible(true);
  };

  // placeholder for save session logic currerntly just navigates back
  const handleSaveSession = () => {
    resetData();
    console.log("Saving session...");
    setIsSaveModalVisible(false);
    router.back(); 
  };

  // placeholder for discard session logic currently just resets the data and navigates back
  const handleDiscardSession = () => {
    resetData();
    console.log("Discarding session...");
    setIsSaveModalVisible(false);
    router.back(); 
  };

  const handleCancelSave = () => {
    setIsSaveModalVisible(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
        <View style={styles.header}>
            <View style={styles.headerColumn}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="chevron-back" style={styles.backButtonIcon} />
                <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
            </View>
            <View style={[styles.headerColumn, styles.headerCenter]}>
                <Text style={styles.title} numberOfLines={1}>Serve Session</Text>
            </View>
            <View style={styles.headerColumn}>
                <TouchableOpacity style={styles.finishButton} onPress={handleFinishPress}>
                    <Text style={styles.finishButtonText}>Finish</Text>
                </TouchableOpacity>
            </View>
        </View>
            <ScrollView style={styles.scroll}>

              <View style = {styles.container}>
                  <Text style={styles.sectionTitle}>Previous Serve</Text>
                  <PostServe type="wrist" data={wristData} expanded={false} onToggle={() => {}} />
                  <PostServe type="speed" data={speedData} expanded={false} onToggle={() => {}} />
                  <PostServe type="pronationSpeed" data={pronationSpeedData} expanded={false} onToggle={() => {}} />
                  <PostServe type="contactYEuler" data={contactYEulerData} expanded={false} onToggle={() => {}} />
                  <PostServe type="contactPronation" data={contactPronationData} expanded={false} onToggle={() => {}} />
                  <Text style={styles.sectionTitle}>Session Summary</Text>
                  <View style={styles.statTotalCard}>
                    <StatTotals data={sessionSummaryData} />
                  </View>
                  <StatGrid data={getCurrentGridScores() as GridScore[]} />
                  <View style={styles.showAllCard}>
                    <Text style={styles.showAllText}>Show All Serves</Text>
                    <Ionicons name="chevron-forward" size={34} color={color.accentText} />
                  </View>
              </View>
        </ScrollView>
        <SaveSessionModal
          visible={isSaveModalVisible}
          onSave={handleSaveSession}
          onDiscard={handleDiscardSession}
          onCancel={handleCancelSave}
        />
        <CalibrateModal
          visible={isCalibrateModalVisible}
          onCancel={() => setIsCalibrateModalVisible(false)}
        />
    </View>
  );
}

const styles = StyleSheet.create({  
    container: {
        paddingHorizontal: 28,
        paddingBottom: spacing.m,
        backgroundColor: "black",
    },
    header: {
        width: '100%',
        paddingHorizontal: 28,
        paddingTop: 50,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'black', 
    },
    headerColumn: {
        flex: 1,
        justifyContent: 'center',
    },
    headerCenter: {
        alignItems: 'center',
        flex: 2,
    },
    backButton: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    backButtonIcon: {
        fontSize: 24,
        color: "white",
        marginRight: 6,
    },
    backButtonText: {
        fontFamily: 'Inter-Regular',
        fontSize: 14,
        color: "white",
    },
    title: {
        fontFamily: 'Inter-Bold',
        fontSize: 24,
        color: "white",
        textAlign: 'center',
    },
    statTotalCard: {
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.l,
        backgroundColor: color.card,
        borderRadius: 12,
        marginBottom: spacing.m,
    },
    scroll: {
        backgroundColor: "black",
    },
    sectionTitle: {
        color: "white",
        fontSize: 20,
        fontFamily: 'Inter-Bold',
        marginBottom: spacing.m,
    },
    showAllCard: {
        marginTop: spacing.s,
        backgroundColor: color.card,
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.xl,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 12,
        marginBottom: spacing.xl,
    },
    showAllText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Inter-Medium',
    },
    finishButton: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 30,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    finishButtonText: {
        color: color.purple,
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        textAlign: 'right',
    },
})