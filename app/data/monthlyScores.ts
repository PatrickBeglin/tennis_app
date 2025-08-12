// monthlyScores: mock data file for bar chart
export interface MonthlyScore {
    key: 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december'
    label: string
    value: number
  }
  
  // mock data
export const MONTHLY_SCORES = [
    { month: 'J', value: 40 },
    { month: 'F', value: 30 },
    { month: 'M', value: 20 },
    { month: 'A', value: 50 },
    { month: 'M', value: 70 },
    { month: 'J', value: 30 },
    { month: 'J', value: 60 },
    { month: 'A', value: 40 },
    { month: 'S', value: 50 },
    { month: 'O', value: 70 },
    { month: 'N', value: 80 },
    { month: 'D', value: 51, highlight: true },
  ];