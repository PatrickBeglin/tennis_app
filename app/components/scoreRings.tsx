// ScoreRings: Component for the score rings on the home and summary pages
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AnimatedCircularProgress } from 'react-native-circular-progress'
import color from '../colors'
import type { Score } from '../data/averageScores'
import spacing from '../spacing'

type Props = {
  data: Score[]
  size?: number // diameter of each ring
  width?: number // stroke thickness
  onSegmentPress?: (key: Score['key'] | 'overall') => void
  selectedKey?: Score['key'] | 'overall' 
}

export default function ScoreRings({
  data,
  size = 100,
  width = 10,            
  onSegmentPress,
  selectedKey,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.ringRow}>
        {data.map((s) => (
          <TouchableOpacity
            key={s.key}
            onPress={() => {
              if (onSegmentPress) {
                if (selectedKey === s.key) {
                  onSegmentPress('overall'); // Switch to overall if already selected
                } else {
                  onSegmentPress(s.key);
                }
              }
            }}
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
                tintColor={
                  selectedKey === undefined || selectedKey === 'overall'
                    ? getColorForKey(s.key)
                    : (selectedKey === s.key ? getColorForKey(s.key) : color.accentText)
                }
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
    color: "white",
    fontFamily: 'Inter-Medium',
    fontSize: 24
  },
  labelText: {
    marginTop: 8,
    fontSize: 14,
    color: color.accentText,
    fontFamily: 'Inter-Regular',
  },
})
