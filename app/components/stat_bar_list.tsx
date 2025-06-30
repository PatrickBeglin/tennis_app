import React from 'react'
import { StyleSheet, View } from 'react-native'
import StatBar from '../components/stat_bar'
import type { ServeModeData } from '../data/serve_scores'

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