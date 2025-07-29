export const options = {
    headerShown: false,
  };

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import color from "./colors";
import { PostServe } from "./components/postServe";
import SaveSessionModal from "./components/SaveSessionModal";
import StatGrid from "./components/stat_grid";
import { StatTotals } from "./components/stat_totals";
import { getCurrentGridScores, processLiveData } from './data/liveDataProcessing';
import spacing from "./spacing";
  

export default function AboutScreen() {
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [swingData, setSwingData] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newData = processLiveData();
      if (newData.length > 0) { // Only update if there's new data
        setSwingData(newData);
      }
    }, 1000); // Check every second

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
    sliderValue: 0
  };
  const speedData = swingData[1] || {
    title: 'Speed',
    value: '0',
    delta: '0',
    avg: '0',
    best: '0',
    score: '0',
    label: ['20mph', '150mph'],
    proRange: '85mph - 95mph',
    tip: 'No data available',
    status: 'No Data',
    statusColor: '#666666',
    sliderValue: 0
  };
  
  // Extract session summary data
  const sessionSummaryData = swingData[3] || {
    title: 'Session Summary',
    timePlayed: "0mins",
    totalServes: 0,
    totalScore: 0
  };

  const handleFinishPress = () => {
    setIsSaveModalVisible(true);
  };

  const handleSaveSession = () => {
    // TODO: Implement save session logic
    console.log("Saving session...");
    setIsSaveModalVisible(false);
    router.back(); // Navigate back after saving
  };

  const handleDiscardSession = () => {
    // TODO: Implement discard session logic
    console.log("Discarding session...");
    setIsSaveModalVisible(false);
    router.back(); // Navigate back after discarding
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
                  <Text style={styles.sectionTitle}>Session Summary</Text>
                  <View style={styles.statTotalCard}>
                    <StatTotals data={sessionSummaryData} />
                  </View>
                  <StatGrid data={getCurrentGridScores()} />
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