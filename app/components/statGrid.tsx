import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import color from '../colors';
import type { GridScore } from '../data/gridAverageScores';
import spacing from '../spacing';

export default function StatGrid({ data }: { data: GridScore[] }) {
  return (
    <View style={styles.grid}>
      {data.map(stat => (
        <View key={stat.key} style={styles.gridItem}>
          <View style={styles.row}>
            <View style={styles.circle} />
            <View style={styles.textContainer}>
              <Text style={styles.gridItemLabel}>{stat.label}</Text>
              <Text style={styles.gridItemValue}>{stat.value}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    backgroundColor: color.card,
    padding: spacing.m,
    width: '49%',
    marginBottom: 8,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: color.cardLight,
    marginRight: spacing.m,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  gridItemLabel: {
    color: "white",
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: -2,
  },
  gridItemValue: {
    color: "white",
    fontSize: 24,
    fontFamily: 'Inter-Medium',
  },
});