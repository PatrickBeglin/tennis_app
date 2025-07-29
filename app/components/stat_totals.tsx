import React from 'react'
import { StyleSheet, Text, View, ViewStyle } from 'react-native'
import type { ServeModeData } from '../data/serve_scores'



type Props = {
  data: ServeModeData
  containerStyle?: ViewStyle
}

export function StatTotals({
  data,
  containerStyle,
}: Props) {
  // split "48mins" → ["48","mins"]
  const [num, unit] = (() => {
    const match = /^(\d+)(.*)$/.exec(data.timePlayed)
    return match ? [match[1], match[2]] : [data.timePlayed, '']
  })()

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.block}>
        <Text style={styles.label}>Time played</Text>
        <View style={styles.numberRow}>
          <Text style={styles.number}>{num}</Text>
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Total serves</Text>
        <Text style={styles.number}>{data.totalServes}</Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Total score</Text>
        <Text style={styles.number}>{data.totalScore}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',                        
    flexDirection: 'row',
    justifyContent: 'space-between',       
  },
  block: {
    flex: 1,
    alignItems: 'flex-start',              
  },
  label: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: 'white',
    marginBottom: 8,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  number: {
    fontFamily: 'Inter-Medium',
    fontSize: 32,
    color: 'white',
  },
  unit: {
    fontFamily: 'Inter-Medium',            
    fontSize: 16,                          
    color: 'white',                       
    marginLeft: 4,
    lineHeight: 32,                       
  },
})
