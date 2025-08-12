// file creating a bar chart component from gifted charts
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart as GiftedBarChart } from 'react-native-gifted-charts';
import color from '../colors';
import spacing from '../spacing';

interface MonthlyScore {
  month: string;
  value: number;
}

interface BarChartProps {
  data: MonthlyScore[];
  title?: string;
  score?: string;
  colour?: string;
}

const BarChart: React.FC<BarChartProps> = ({ data, title = '', score = '', colour }) => {
  const chartData = data.map(d => ({ value: d.value, label: d.month }));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.score}>{score}</Text>
      </View>
      <GiftedBarChart
        data={chartData}
        barWidth={16}
        barBorderRadius={8}
        frontColor= {colour}
        yAxisThickness={-5}
        xAxisThickness={0}
        yAxisTextStyle={{ color: color.accentText, fontFamily: 'Inter-Regular', fontSize: 12 }}
        xAxisLabelTextStyle={{ color: color.accentText, fontFamily: 'Inter-Regular', fontSize: 12 }}
        maxValue={100}
        noOfSections={2}
        height={150}
        spacing={18}
        isAnimated
        hideRules
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.card,
    borderRadius: 12,
    padding: spacing.m,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.l,
  },
  title: {
    color: color.accentText,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  score: {
    color: color.accentText,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});

export default BarChart;
