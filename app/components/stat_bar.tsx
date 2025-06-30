import { LinearGradient, LinearGradientProps } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import color from '../colors';
import type { ServeMetric } from '../data/serve_scores';
import spacing from '../spacing';

type Props = {
  metricObj: ServeMetric
  gradientColors?: LinearGradientProps['colors']
}

export default function StatBar({
  metricObj: {
    name,
    metric: { valuePercent, status },
  },
  gradientColors = [
    '#e74c3c',
    '#f1c40f',
    '#2ecc71',
    '#f1c40f',
    '#e74c3c',
  ],
}: Props) {
  return (
    <View style={styles.container}>
      {/* Text row on top */}
      <View style={styles.textRow}>
        <Text style={styles.label}>{name}</Text>
        <Text style={styles.rating}>{status}</Text>
      </View>

      {/* Gradient bar below */}
      <View style={styles.barWrapper}>
        <View style={styles.gradientMask}>
          <LinearGradient
            colors={gradientColors}
            start={[0, 0]}
            end={[1, 0]}
            style={styles.bar}
          />
        </View>
        <View
          style={[
            styles.thumb,
            { left: `${valuePercent * 100}%` },
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
