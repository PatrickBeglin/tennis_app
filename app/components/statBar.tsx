import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import color from '../colors';
import type { ServeMetric } from '../data/serveScores';
import spacing from '../spacing';

type Props = {
  metricObj: ServeMetric
}

export default function StatBar({
  metricObj: {
    name,
    metric: { valuePercent, status, statusColor, sliderGradient },
  },
}: Props) {
  // Calculate thumb position based on status
  const getThumbPosition = (): number => {
    switch (status) {
      case "Poor":
        return 0;
      case "Ok":
        return 25;
      case "Good":
        return 50;
      case "Excellent":
        return 75;
      case "Perfect":
        return 100;
      case "Sub Optimal":
        return 25;
      case "Late":
        return 75;
      default:
        return valuePercent * 100;
    }
  };

  return (
    <View style={styles.container}>
      {/* Text row on top */}
      <View style={styles.textRow}>
        <Text style={styles.label}>{name}</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBall, { backgroundColor: statusColor }]} />
          <Text style={styles.rating}>{status}</Text>
        </View>
      </View>

      {/* Gradient bar below */}
      <View style={styles.barWrapper}>
        <View style={styles.gradientMask}>
          <LinearGradient
            colors={[
              color.accentGrey,  // #656565
              color.purple,      // #D293FF
              color.purple,      // #D293FF
              color.accentGrey,  // #656565
            ]}
            locations={sliderGradient as [number, number, number, number]}
            start={[0, 0]}
            end={[1, 0]}
            style={styles.bar}
          />
        </View>
        <View
          style={[
            styles.thumb,
            { left: `${getThumbPosition()}%` },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.m,
    width: '100%',
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  label: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter-Regular',

  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  rating: {
    color: color.accentText,  
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  barWrapper: {
    marginTop: 4,
    position: 'relative',
    overflow: 'visible',
  },
  gradientMask: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  bar: {
    width: '100%',
    height: '100%',
  },
  thumb: {
    position: 'absolute',
    width: 6,
    height: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    top: -(20 - 8) / 2,
  },
})
