import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AnimatedCircularProgress } from 'react-native-circular-progress'
import color from '../colors'
import type { Score } from '../data/average_scores'
import spacing from '../spacing'

type Props = {
  data: Score[]
  size?: number          // diameter of each ring
  width?: number         // stroke thickness
  onSegmentPress?: (key: Score['key']) => void
}

export default function ScoreRings({
  data,
  size = 100,
  width = 10,            
  onSegmentPress,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.ringRow}>
        {data.map((s) => (
          <TouchableOpacity
            key={s.key}
            onPress={() => onSegmentPress?.(s.key)}
            activeOpacity={0.7}
            style={styles.ringWrapper}
          >
            <View style={{
              width:  size + width,
              height: size + width,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <AnimatedCircularProgress
                size={size}
                width={width}
                fill={s.value}
                rotation={0}
                lineCap="round"             
                tintColor={getColorForKey(s.key)}
                backgroundColor = {color.cardLight}
                duration={500}
              />
            
              <View style={{
                position: 'absolute',
                top:   width / 2,
                left:  width / 2,
                right: width / 2,
                bottom:width / 2,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={[styles.valueText,]}>
                  {s.value}
                </Text>
              </View>
            </View>

            <Text style={styles.labelText}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

function getColorForKey(key: Score['key']) {
  switch (key) {
    case 'serve':    return color.blue
    case 'forehand': return color.teal
    case 'backhand': return color.yellow
    default:         return '#fff'
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.card,
    borderRadius: 12,
    paddingTop: spacing.l,
    paddingBottom: spacing.l,
    paddingRight: spacing.m,
    paddingLeft: spacing.m,
    marginBottom: spacing.l
  },
  ringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',  
    alignItems: 'center',
  },
  ringWrapper: {
    alignItems: 'center',
  },
  valueText: {
    color: '#fff',
    fontFamily: 'Inter-Medium',
    fontSize: 24
  },
  labelText: {
    marginTop: 8,
    fontSize: 12,
    color: 'white',
    fontFamily: 'Inter-Regular',
  },
})
