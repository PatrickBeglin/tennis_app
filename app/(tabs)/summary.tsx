import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import color from "../colors";
import BarChart from "../components/barChart";
import ScoreRings from "../components/scoreRings";
import { ShowAllCard } from "../components/showAll";
import StatGrid from "../components/statGrid";
import { AVERAGE_SCORES } from "../data/averageScores";
import { GRID_AVERAGE_SCORES } from "../data/gridAverageScores";
import { MONTHLY_SCORES } from "../data/monthlyScores";
import spacing from "../spacing";


export default function SummaryScreen() {
  const { mode } = useLocalSearchParams();
  const allowedModes = ["overall", "serve", "forehand", "backhand"] as const;

  // Coerce selectedMode to a string and validate
  const initialMode = Array.isArray(mode) ? mode[0] : mode;
  const isValidMode = allowedModes.includes(initialMode as any);
  const safeInitialMode = isValidMode ? initialMode : "overall";

  const [selectedMode, setSelectedMode] = React.useState<typeof allowedModes[number]>(safeInitialMode as typeof allowedModes[number]);

  React.useEffect(() => {
    const newMode = Array.isArray(mode) ? mode[0] : mode;
    if (allowedModes.includes(newMode as any)) {
      setSelectedMode(newMode as typeof allowedModes[number]);
    }
  }, [mode]);

  const barTitle = selectedMode === "overall" ? "Average Monthly Overall Score" : selectedMode === "serve" ? "Average Monthly Serve Score" : selectedMode === "forehand" ? "Average Monthly Forehand Score" : "Average Monthly Backhand Score";
  const barColour = selectedMode === "overall" ? color.purple : selectedMode === "serve" ? color.blue : selectedMode === "forehand" ? color.teal : selectedMode === "backhand" ? color.yellow : color.purple;

  return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerColumn}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" style={styles.backButtonIcon} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.headerColumn, styles.headerCenter]}>
            <Text style={styles.title}>Summary</Text>
          </View>
          <View style={styles.headerColumn} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
          <View style={styles.doubleTitle}>
            <Text style={styles.sectionTitle}>Average Scores</Text>
            <Text style={styles.showMore}>Show more</Text>
          </View>
          <ScoreRings data={AVERAGE_SCORES} size={95} width={12} onSegmentPress={setSelectedMode} selectedKey={selectedMode} />

          <View style={styles.doubleTitle}>
            <Text style={styles.sectionTitleMini}>This month vs last month</Text>
            <Text style={styles.showMore}>Show more</Text>
          </View>
          <StatGrid data={GRID_AVERAGE_SCORES} /> 
          <View style={styles.doubleTitle}>
            <Text style={styles.sectionTitle}>Year in Review</Text>
            <Text style={styles.showMore}>Show more</Text>
          </View>
          <BarChart data={MONTHLY_SCORES} title={barTitle} score="51/100" colour={barColour} />  
          <ShowAllCard />
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
    alignItems: 'center',
    backgroundColor: 'black', 
  },
  headerColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
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
  doubleTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline'
  },
  showMore: {
    fontSize: 14,
    color: color.accentText,
  },
  sectionTitle: {
    color: "white",
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: spacing.m,
  },
  sectionTitleMini: {
    color: "white",
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: spacing.m,   
  }
})