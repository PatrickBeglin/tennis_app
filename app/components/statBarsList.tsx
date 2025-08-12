// StatBarsList: Component for the stat bars on the home page
import React from 'react'
import { StyleSheet, View } from 'react-native'
import type { ServeModeData } from '../data/serveScores'
import StatBar from './stat_bar'

export function StatBarsList({ data }: { data: ServeModeData }) {
  return (
    <View style={styles.list}>
      {data.metrics.map((m) => (
        <StatBar key={m.name} metricObj={m} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { marginBottom: 32 },
})