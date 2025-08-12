// grid_average_scores: mock data file for grid scores used on summary and serve mode pages
export interface GridScore {
    key: 'wrist_pronation' | 'torso_rotation' | 'shot_timing' | 'swing_speed'
    label: string
    value: number
  }
  
  // mock data
  export const GRID_AVERAGE_SCORES: GridScore[] = [
    { key: 'wrist_pronation', label: 'Wrist Pronation', value: 79 },
    { key: 'torso_rotation', label: 'Torso Rotation', value: 79 },
    { key: 'shot_timing', label: 'Shot Timing', value: 79 },
    { key: 'swing_speed', label: 'Swing Speed', value: 79 },
  ]