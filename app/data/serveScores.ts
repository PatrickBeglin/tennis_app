// serveScores: mock data file for the previous session scores shown on home page

export interface ServeMetric {
  name: string
  metric: {
    valuePercent: number  
    status: string
    statusColor: string 
    sliderGradient: number[]  
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
    { name: "Wrist Pronation",  metric: { valuePercent: 0.3, status: "Good", statusColor: "#00FF36", sliderGradient: [0.66,0.71,0.83,0.88] } },
    { name: "Swing Speed",       metric: { valuePercent: 0.5, status: "Excellent", statusColor: "#00FF36", sliderGradient: [0.71,0.76,1,1] } },
    { name: "Pronation Speed",   metric: { valuePercent: 0.1, status: "Ok", statusColor: "#FFE400", sliderGradient: [0.75,0.8,1,1] } },
    { name: "Contact Timing",    metric: { valuePercent: 0.7, status: "Late", statusColor: "#FF0000", sliderGradient: [0.5,0.55,0.62,0.68] } },
  ]
}