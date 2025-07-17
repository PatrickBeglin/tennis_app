import React from 'react';
import { Text, View } from 'react-native';
import CalendarHeatmap from 'react-native-calendar-heatmap';

const today = new Date();

export default function ContributionGraph() {
  return (
    <View
      style={{
        backgroundColor: '#232025',
        borderRadius: 32,
        padding: 24,
        margin: 16,
        alignItems: 'flex-start',
        // overflow: 'hidden', // optional, clips overflow
      }}
    >
      <Text
        style={{
          color: 'white',
          fontSize: 24,
          fontWeight: '400',
          marginBottom: 16,
        }}
      >
        36 General Sessions this Year
      </Text>
      <View
        style={{
          width: '100%', // fill parent, don't overflow
          height: 140,
          justifyContent: 'center',
          // borderWidth: 1, // for debugging, remove if not needed
          // borderColor: 'red',
        }}
      >
        <CalendarHeatmap
          endDate={today}
          numDays={3}
          values={[
            { date: '2023-12-10', count: 1 },
            { date: '2024-01-15', count: 2 },
            { date: '2024-03-20', count: 3 },
            { date: '2024-05-05', count: 4 },
            { date: '2024-05-10', count: 2 },
            { date: '2024-05-15', count: 1 },
          ]}
          colorArray={[
            '#232025', // empty
            '#b5b5b5', // low
            '#7bc96f', // medium
            '#239a3b', // high
            '#196127', // very high
          ]}
          gutterSize={1}
          squareSize={10}
          showMonthLabels={true}
          showWeekdayLabels={true}
        />
      </View>
    </View>
  );
}