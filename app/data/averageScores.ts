// averageScores: mock data file for average scores on the summary page
export interface Score {
  key: 'serve' | 'forehand' | 'backhand'
  label: string
  value: number
}

// mock data
export const AVERAGE_SCORES: Score[] = [
  { key: 'serve',     label: 'Serve',     value: 79 },
  { key: 'forehand',  label: 'Forehand',  value: 64 },
  { key: 'backhand',  label: 'Backhand',  value: 51 },
]