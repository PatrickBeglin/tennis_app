export interface ServeMetric {
  name: string
  metric: {
    valuePercent: number  
    status: string       
  }
}

export interface ServeModeData {
  timePlayed: string
  totalServes: number
  totalScore: number
  metrics: ServeMetric[]
}
// mock data
export const serveData: ServeModeData = {
  timePlayed: "48mins",
  totalServes: 123,
  totalScore: 68,
  metrics: [
    { name: "Wrist Pronation",  metric: { valuePercent: 0.3, status: "Good" } },
    { name: "Swing Speed",       metric: { valuePercent: 0.5, status: "Perfect" } },
    { name: "Torso Rotation",    metric: { valuePercent: 0.1, status: "Sub Optimal" } },
    { name: "Shot Timing",       metric: { valuePercent: 0.7, status: "Late" } },
  ]
}