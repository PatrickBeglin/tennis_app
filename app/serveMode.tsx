export const options = {
    headerShown: false,
  };

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import color from "./colors";
import { PostServe } from "./components/postServe";
import SaveSessionModal from "./components/SaveSessionModal";
import StatGrid from "./components/stat_grid";
import { StatTotals } from "./components/stat_totals";
import { GRID_AVERAGE_SCORES } from "./data/grid_average_scores";
import { serveData } from "./data/serve_scores";
import spacing from "./spacing";

const postServeStats = [
    {
      type: 'wrist',
      value: "48°",
      delta: "+2°",
      avg: "47°",
      best: "59°",
      score: "78",
      label: { min : "-20°", max : "360°"},
      tip: 'Try to finish your swing with more wrist pronation at impact.',
      status: 'Good',
      statusColor: '#B6FF7A',
      sliderValue: 0.50,
    },
    // Add more objects for other card types
  ];
  

export default function AboutScreen() {
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);

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
                  <PostServe type="wrist" data={postServeStats[0]} expanded={false} onToggle={() => {}} />
                  <PostServe type="wrist" data={postServeStats[0]} expanded={false} onToggle={() => {}} />
                  <PostServe type="wrist" data={postServeStats[0]} expanded={false} onToggle={() => {}} />
                  <PostServe type="wrist" data={postServeStats[0]} expanded={false} onToggle={() => {}} />
                  <Text style={styles.sectionTitle}>Session Summary</Text>
                  <View style={styles.statTotalCard}>
                    <StatTotals data={serveData} />
                  </View>
                  <StatGrid data={GRID_AVERAGE_SCORES} />
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