console.log("LIVE DATA PROCESSING FILE LOADED!");

import { globalSensorData } from "../utils/useBLE";

// Check for data updates every 2 seconds
setInterval(() => {
    // Only log if there's actual data
    if (Object.keys(globalSensorData).length > 0) {
        //console.log("LIVE DATA PROCESSING Current global sensor data:", globalSensorData);
    }
}, 2000);

// ------------------------------------------------------- wrist pronation -------------------------------------------------------

let yRotationScores: number[] = [];
let averageYRotationScore = 0;
let total = 0;
let bestYRotationDifference = 0;
let lastMeaningfulDelta = "0°";

let swingSpeedScores: number[] = [];
let averageSwingSpeed = 0;
let swingSpeedTotal = 0;
let bestSwingSpeed = 0;
let lastMeaningfulSpeedDelta = "0 mph";

let timePlayed = 0;
let totalServes = yRotationScores.length;

let scoresArray: number[] = [];
let totalAvgScore = 0;

let averageWristScore = 0;
let averageSwingSpeedScore = 0;

let swingScoresArray: number[] = [];
let wristScoresArray: number[] = [];
let yEulerScoresArray: number[] = [];
let contactPronationArray: number[] = [];

let pronationSpeedArray: number[] = [];
let bestPronationSpeed = 0;
let pronationSpeed = 0;
let lastMeaningfulPronationSpeedDelta = "0°/s";

let currentContactYEuler = 0;
let currentContactPronation = 0;

let colorGood = "#00FF36";
let colorOk = "#FFE400";
let colorPoor = "#FF0000";
let colorExcellent = "#00FF36";

// Helper function to update grid scores
const updateGridScores = () => {
    averageWristScore = wristScoresArray.length > 0 ? wristScoresArray.reduce((a, b) => a + b, 0) / wristScoresArray.length : 0;
    averageSwingSpeedScore = swingScoresArray.length > 0 ? swingScoresArray.reduce((a, b) => a + b, 0) / swingScoresArray.length : 0;
};

// Helper function to update total average score
const updateTotalAvgScore = () => {
    totalAvgScore = scoresArray.length > 0 ? scoresArray.reduce((a, b) => a + b, 0) / scoresArray.length : 0;
};

// Helper function to validate sensor data
const validateSensorData = (MasterData: any, SlaveData: any): boolean => {
    return !!(MasterData && SlaveData && MasterData.swing && SlaveData.swing);
};

// Helper function to normalize data lengths
const normalizeDataLengths = (MasterData: any, SlaveData: any) => {
    let masterLength = MasterData.swing.length;
    let slaveLength = SlaveData.swing.length;

    if (masterLength > slaveLength) {
        MasterData.swing = MasterData.swing.slice(0, slaveLength);
        masterLength = slaveLength;
    } else if (slaveLength > masterLength) {
        SlaveData.swing = SlaveData.swing.slice(0, masterLength);
        slaveLength = masterLength;
    }

    return masterLength;
};

const calculateMaxWristPronation = (MasterData: any, SlaveData: any, dataLength: number): number => {
    let maxPronation = 0;

    // Just find the highest pronation value from slave data (already scaled in useBLE)
    for (let i = 0; i < dataLength; i++) {
        const pronationValue = SlaveData.swing[i]; // This is already the pronation value in degrees
        if (pronationValue > maxPronation) {
            maxPronation = pronationValue;
        }
    }

    console.log("Max wrist pronation from slave:", maxPronation);
    return maxPronation;
};

// Helper function to get rotation tip
const getRotationTip = (maxYRotationDifference: number): string => {
    if (maxYRotationDifference < 75) {
        return "Try to finish your swing with more wrist pronation at impact.";
    }
    else if (maxYRotationDifference > 85) {
        return "Try to finish your swing with less wrist pronation at impact. Excessive pronation can lead to injury.";
    }
    return "Your wrist pronation is within the optimal range.";
};

// Helper function to calculate rotation score
const calculateRotationScore = (maxYRotationDifference: number): number => {
    let rotationScore = Math.round((maxYRotationDifference / 80) * 100);
    return rotationScore > 100 ? 100 : rotationScore;
};

// Helper function to calculate delta
const calculateDelta = (maxYRotationDifference: number): string => {
    let lastSwingScore = 0;
    if (yRotationScores.length > 0) {
        lastSwingScore = yRotationScores[yRotationScores.length - 1];
    }
    
    // Only show delta if this is a new swing (different from last)
    if (yRotationScores.length === 0 || maxYRotationDifference !== lastSwingScore) {
        let delta = maxYRotationDifference - lastSwingScore;
        if (delta > 0) {
            lastMeaningfulDelta = "+" + String(Math.round(delta)) + "°";
        } else {
            lastMeaningfulDelta = String(Math.round(delta)) + "°";
        }
        return lastMeaningfulDelta;
    }
    
    // Return the last meaningful delta if no new swing
    return lastMeaningfulDelta;
};

// Helper function to update averages
const updateAverages = (maxYRotationDifference: number) => {
    // Only add new score if it's different from the last one (indicating a new swing)
    if (yRotationScores.length === 0 || maxYRotationDifference !== yRotationScores[yRotationScores.length - 1]) {
        yRotationScores.push(maxYRotationDifference);
        
        // Reset total and recalculate average only when new data is added
        total = 0;
        for (let i = 0; i < yRotationScores.length; i++) {
            total += yRotationScores[i];
        }
        averageYRotationScore = Math.round(total / yRotationScores.length);
        
        // Add rotation score to total scores array and update total average
        let rotationScore = Math.round((maxYRotationDifference / 80) * 100);
        if (rotationScore > 100) rotationScore = 100;
        wristScoresArray.push(rotationScore);
        scoresArray.push(rotationScore);
        updateTotalAvgScore();
        updateGridScores();
    }
};

// Helper function to determine wrist status
const getWristStatus = (maxYRotationDifference: number): { status: string; color: string } => {
    if (maxYRotationDifference < 30) {
        return { status: "Poor", color: colorPoor };
    } else if (maxYRotationDifference < 45) {
        return { status: "Ok", color: colorOk };
    } else if (maxYRotationDifference < 60) {
        return { status: "Good", color: colorGood };
    } else if (maxYRotationDifference < 75) {
        return { status: "Excellent", color: colorExcellent };
    } else if (maxYRotationDifference < 90) {
        return { status: "Injury level", color: colorPoor };
    } else {
        return { status: "Impossible", color: colorPoor };
    }
};

// Helper function to calculate slider value
const calculateSliderValue = (maxYRotationDifference: number): number => {
    return maxYRotationDifference / 100;
};

// ------------------------------------------------------- swing speed -------------------------------------------------------

// Helper function to calculate swing speed delta
const calculateSpeedDelta = (swingSpeed: number): string => {
    let lastSwingSpeed = 0;
    if (swingSpeedScores.length > 0) {
        lastSwingSpeed = swingSpeedScores[swingSpeedScores.length - 1];
    }
    
    // Only show delta if this is a new swing (different from last)
    if (swingSpeedScores.length === 0 || swingSpeed !== lastSwingSpeed) {
        let delta = swingSpeed - lastSwingSpeed;
        if (delta > 0) {
            lastMeaningfulSpeedDelta = "+" + String(Math.round(delta)) + " mph";
        } else {
            lastMeaningfulSpeedDelta = String(Math.round(delta)) + " mph";
        }
        return lastMeaningfulSpeedDelta;
    }
    
    // Return the last meaningful delta if no new swing
    return lastMeaningfulSpeedDelta;
};

// Helper function to update swing speed averages
const updateSpeedAverages = (swingSpeed: number) => {
    // Only add new score if it's different from the last one (indicating a new swing)
    if (swingSpeedScores.length === 0 || swingSpeed !== swingSpeedScores[swingSpeedScores.length - 1]) {
        swingSpeedScores.push(swingSpeed);
        
        // Reset total and recalculate average only when new data is added
        swingSpeedTotal = 0;
        for (let i = 0; i < swingSpeedScores.length; i++) {
            swingSpeedTotal += swingSpeedScores[i];
        }
        averageSwingSpeed = Math.round(swingSpeedTotal / swingSpeedScores.length);
        
        // Add swing speed score to total scores array and update total average
        let swingScore = Math.round((swingSpeed / 120) * 100);
        scoresArray.push(swingScore);
        swingScoresArray.push(swingScore);
        updateTotalAvgScore();
        updateGridScores();
    }
};

const calculateSwingSliderValue = (swingSpeed: number): number => {
    return swingSpeed / 120;
};

const calculateSwingScore = (swingSpeed: number): number => {
    let swingScore = Math.round((swingSpeed / 120) * 100);
    return swingScore;
};

const calculateSwingStatus = (swingSpeed: number): string => {
    if (swingSpeed < 30) {
        return 'Poor';
    } else if (swingSpeed < 50) {
        return 'Ok';
    } else if (swingSpeed < 80) {
        return 'Good';
    } else {
        return 'Excellent';
    }
};

const calculateSwingStatusColor = (swingSpeed: number): string => {
    if (swingSpeed < 30) {
        return colorPoor;
    } else if (swingSpeed < 50) {
        return colorOk;
    } else if (swingSpeed < 80) {
        return colorGood;
    } else {
        return colorExcellent;
    }
};

const getSwingSpeedTip = (swingSpeed: number): string => {
    if (swingSpeed < 30) {
        return "Focus on generating more power through your legs and core rotation.";
    } else if (swingSpeed < 50) {
        return "Work on your timing and follow-through to increase swing speed.";
    } else if (swingSpeed < 80) {
        return "Good speed! Focus on consistency and accuracy.";
    } else {
        return "Excellent speed! Maintain this level while working on precision.";
    }
};

const getPronationSpeed = (MasterData: any): string => {
    let currentPronationSpeed = MasterData.pronation_speed || 0; // Get from master, not slave
    console.log("Pronation speed:", currentPronationSpeed);
    return String(Math.round(currentPronationSpeed)) + "°/s";
};

const updatePronationSpeedAverages = (newPronationSpeed: number) => {
    // Only add new score if it's different from the last one (indicating a new swing)
    if (pronationSpeedArray.length === 0 || newPronationSpeed !== pronationSpeedArray[pronationSpeedArray.length - 1]) {
        pronationSpeedArray.push(newPronationSpeed);
        
        // Update best pronation speed
        if (newPronationSpeed > bestPronationSpeed) {
            bestPronationSpeed = newPronationSpeed;
        }
    }
};

const getPronationSpeedAverage = (): string => {    
    let total = pronationSpeedArray.length > 0 ? pronationSpeedArray.reduce((a, b) => a + b, 0) / pronationSpeedArray.length : 0;
    return String(Math.round(total)) + "°/s";
}

const getPronationSpeedDelta = (currentPronationSpeed: number): string => {
    let lastPronationSpeed = 0;
    if (pronationSpeedArray.length > 0) {   
        lastPronationSpeed = pronationSpeedArray[pronationSpeedArray.length - 1];
    }
    let pronationSpeedDelta = currentPronationSpeed - lastPronationSpeed;
    if (pronationSpeedDelta > 0) {
        lastMeaningfulPronationSpeedDelta = "+" + String(Math.round(pronationSpeedDelta)) + "°/s";
    } else {
        lastMeaningfulPronationSpeedDelta = String(Math.round(pronationSpeedDelta)) + "°/s";
    }
    return lastMeaningfulPronationSpeedDelta;
}

const getPronationSpeedScore = (currentPronationSpeed: number): string => {
    let pronationSpeedScore = Math.round((currentPronationSpeed / 1500) * 100);
    return String(pronationSpeedScore);
}

const getPronationSpeedStatus = (currentPronationSpeed: number): string => {
    if (currentPronationSpeed < 500) {
        return "Poor";
    } else if (currentPronationSpeed < 1000) {
        return "Ok";
    } else if (currentPronationSpeed < 1500) {
        return "Good";
    } else {
        return "Excellent";
    }
}

const getPronationSpeedStatusColor = (currentPronationSpeed: number): string => {
    if (currentPronationSpeed < 500) {
        return colorPoor;
    } else if (currentPronationSpeed < 1000) {
        return colorOk;
    } else if (currentPronationSpeed < 1500) {
        return colorGood;
    } else {
        return colorExcellent;
    }
}

const getPronationSpeedTip = (currentPronationSpeed: number): string => {
    if (currentPronationSpeed < 500) {
        return "Focus on generating more power through your legs and core rotation.";
    } else if (currentPronationSpeed < 1000) {
        return "Work on your timing and follow-through to increase swing speed.";
    } else if (currentPronationSpeed < 1500) {
        return "Excellent speed! Maintain this level while working on precision.";
    } else {
        return "No data available";
    }
}

const getPronationSpeedSliderValue = (currentPronationSpeed: number): number => {
    return (currentPronationSpeed / 2000);
}

const getContactYEuler = (MasterData: any): string => {
    currentContactYEuler = MasterData.impact_euler_y || 0; // Get from master, not slave
    yEulerScoresArray.push(currentContactYEuler);
    return String(Math.round(currentContactYEuler)) + "°";
}

const getContactPronation = (MasterData: any, SlaveData: any): string => {
    currentContactPronation = SlaveData.swing[MasterData.impact_index] || 0; // Get from slave
    contactPronationArray.push(currentContactPronation);
    return String(Math.round(currentContactPronation)) + "°";
}

const getYEulerDelta = (): string => {
    let lastMeaningfulYEulerDelta = "0°";
    if (yEulerScoresArray.length > 0) {
        let delta = currentContactYEuler - yEulerScoresArray[yEulerScoresArray.length - 1];
        if (delta > 0) {
            lastMeaningfulYEulerDelta = "+" + String(Math.round(delta)) + "°";
        } else {
            lastMeaningfulYEulerDelta = "-" + String(Math.round(delta)) + "°";
        }
        return lastMeaningfulYEulerDelta;
    }
    return lastMeaningfulYEulerDelta;
}

const getContactPronationDelta = (): string => {
    let lastMeaningfulPronationDelta = "0°";
    if (contactPronationArray.length > 0) {
        let delta = currentContactPronation - contactPronationArray[contactPronationArray.length - 1];
        if (delta > 0) {
            lastMeaningfulPronationDelta = "+" + String(Math.round(delta)) + "°";
        } else {
            lastMeaningfulPronationDelta = "-" + String(Math.round(delta)) + "°";
        }
        return lastMeaningfulPronationDelta;
    }
    return lastMeaningfulPronationDelta;
}

const getYEulerAverage = (): string => {
    let average = yEulerScoresArray.length > 0 ? yEulerScoresArray.reduce((a, b) => a + b, 0) / yEulerScoresArray.length : 0;
    return String(Math.round(average)) + "°";
}

const getYEulerBest = (): string => {
    // Filter values <= 60, then find the maximum of those
    let validValues = yEulerScoresArray.filter(value => value <= 60);
    let best = validValues.length > 0 ? Math.max(...validValues) : 0;
    return String(Math.round(best)) + "°";
}

const calculateEulerScore = (eulerValue: number): number => {
    const optimalMin = 60;
    const optimalMax = 75;
    const rangeMin = 0;
    const rangeMax = 120;
    
    // If within optimal range, score is 100
    if (eulerValue >= optimalMin && eulerValue <= optimalMax) {
        return 100;
    }
    
    // Calculate distance from optimal range
    let distanceFromOptimal: number;
    
    if (eulerValue < optimalMin) {
        // Below optimal range - distance from 60
        distanceFromOptimal = optimalMin - eulerValue;
    } else {
        // Above optimal range - distance from 75
        distanceFromOptimal = eulerValue - optimalMax;
    }
    
    // Calculate score: 100 - (distance * penalty factor)
    // Penalty factor determines how quickly score drops
    const penaltyFactor = 100 / Math.max(optimalMin - rangeMin, rangeMax - optimalMax);
    const score = Math.max(0, 100 - (distanceFromOptimal * penaltyFactor));
    
    return Math.round(score);
};

const getEulerStatus = (eulerValue: number): string => {
    if (eulerValue < 20 || eulerValue > 110) {
        return "Poor";
    } else if (eulerValue < 40 || eulerValue > 90) {
        return "Ok";
    } else if (eulerValue < 60 || eulerValue > 75) {
        return "Good";
    } else {
        return "Excellent";
    }
}

const getEulerTip = (eulerValue: number): string => {
    if (eulerValue < 20) {
        return "Try and Throw the ball higher and hit the ball earlier";
    } else if (eulerValue > 110) {
        return "Try to throw the ball further infront and hit through the ball";
    } else if (eulerValue < 40) {
        return "Try to throw the ball higher and hit the ball earlier";
    } else if (eulerValue > 90) {
        return "Try to throw the ball further infront and hit through the ball";
    } else if (eulerValue < 60) {
        return "Youre doing well try to throw the ball higher and hit the ball earlier";
    } else if (eulerValue > 75) {
        return "Try to throw the ball further infront and hit through the ball";
    } else {
        return "Excellent contact angle!";
    }
}

const getEulerStatusColor = (eulerValue: number): string => {
    if (eulerValue < 20 || eulerValue > 110) {
        return colorPoor;
    } else if (eulerValue < 40 || eulerValue > 90) {
        return colorOk;
    } else if (eulerValue < 60 || eulerValue > 75) {
        return colorGood;
    } else {
        return colorExcellent;
    }
}   

const getEulerSliderValue = (eulerValue: number): number => {
    return eulerValue / 120;
}

const getContactPronationAverage = (): string => {
    let average = contactPronationArray.length > 0 ? contactPronationArray.reduce((a, b) => a + b, 0) / contactPronationArray.length : 0;
    return String(Math.round(average)) + "°";
}

const getContactPronationBest = (): string => {
    // Filter values <= 100, then find the maximum of those
    let validValues = contactPronationArray.filter(value => value <= 100);
    let best = validValues.length > 0 ? Math.max(...validValues) : 0;
    return String(Math.round(best)) + "°";
}

const calculateContactPronationScore = (pronationValue: number): number => {
    const optimalMin = 70;
    const optimalMax = 100;
    const rangeMin = 0;
    const rangeMax = 100; // Assuming max pronation is 180°
    
    // If within optimal range, score is 100
    if (pronationValue >= optimalMin && pronationValue <= optimalMax) {
        return 100;
    }
    
    // Calculate distance from optimal range
    let distanceFromOptimal: number;
    
    if (pronationValue < optimalMin) {
        // Below optimal range - distance from 70
        distanceFromOptimal = optimalMin - pronationValue;
    } else {
        // Above optimal range - distance from 100
        distanceFromOptimal = pronationValue - optimalMax;
    }
    
    // Calculate score: 100 - (distance * penalty factor)
    const penaltyFactor = 100 / Math.max(optimalMin - rangeMin, rangeMax - optimalMax);
    const score = Math.max(0, 100 - (distanceFromOptimal * penaltyFactor));
    
    return Math.round(score);
};

const getContactPronationTip = (pronationValue: number): string => {
    if (pronationValue < 50) {
        return "Try to Prontate your wrist more at contact";
    } else if (pronationValue > 75) {
        return "You may be overpronating and risking injury";
    } else {
        return "Excellent contact pronation!";
    }
}
const getContactPronationStatus = (pronationValue: number): string => {
    if (pronationValue < 15 || pronationValue > 100) {
        return "Poor";
    } else if (pronationValue > 30 || pronationValue < 100) {
        return "Ok";
    } else if (pronationValue < 50 || pronationValue > 75) {
        return "Good";
    } else {
        return "Excellent";
    }
}

const getContactPronationStatusColor = (pronationValue: number): string => {
    if (pronationValue < 15 || pronationValue > 100) {
        return colorPoor;
    } else if (pronationValue > 30 || pronationValue < 100) {
        return colorOk;
    } else if (pronationValue < 50 || pronationValue > 75) {
        return colorGood;
    } else {
        return colorExcellent;
    }
}

const getContactPronationSliderValue = (pronationValue: number): number => {
    return pronationValue / 100;
}

    export const resetData = () => {
    // Wrist pronation variables
    yRotationScores = [];
    averageYRotationScore = 0;
    total = 0;
    bestYRotationDifference = 0;
    lastMeaningfulDelta = "0°";
    
    // Swing speed variables
    swingSpeedScores = [];
    averageSwingSpeed = 0;
    swingSpeedTotal = 0;
    bestSwingSpeed = 0;
    lastMeaningfulSpeedDelta = "0 mph";
    
    // Time and session variables
    timePlayed = 0;
    totalServes = 0; // Fixed: was yRotationScores.length which would be 0 anyway
    
    // Score arrays and averages
    scoresArray = [];
    totalAvgScore = 0; // Added missing variable
    averageWristScore = 0;
    averageSwingSpeedScore = 0;
    swingScoresArray = [];
    wristScoresArray = [];
    
    // Pronation speed variables
    pronationSpeedArray = [];
    bestPronationSpeed = 0;
    pronationSpeed = 0;
    lastMeaningfulPronationSpeedDelta = "0°/s";
    
    // Contact variables
    yEulerScoresArray = [];
    contactPronationArray = [];
    currentContactYEuler = 0;
    currentContactPronation = 0;
}

// Main function to process the data
export const processLiveData = () => {
    let MasterData = globalSensorData["ESP32_MASTER"];
    let SlaveData = globalSensorData["ESP32_SLAVE"];

    timePlayed++;

    // Check if data exists before processing
    if (!validateSensorData(MasterData, SlaveData)) {
        return []; // Return empty array if no data
    }

    // Normalize data lengths
    const dataLength = normalizeDataLengths(MasterData, SlaveData);

    // Calculate max wrist pronation using quaternions
    let maxPronation = calculateMaxWristPronation(MasterData, SlaveData, dataLength);
    
    if (maxPronation > bestYRotationDifference && maxPronation < 85) {
        bestYRotationDifference = maxPronation;
    }
    console.log("Wrist pronation angle:", maxPronation);


    // Get rotation tip
    let rotationTip = getRotationTip(maxPronation);

    // Calculate rotation 
    let rotationScore = calculateRotationScore(maxPronation);
    
    // Calculate delta
    let delta = calculateDelta(maxPronation);

    // Update averages
    updateAverages(maxPronation);

    // Get wrist status
    const { status: wristStatus, color: wristStatusColor } = getWristStatus(maxPronation);

    // Calculate slider value
    let wristSliderValue = calculateSliderValue(maxPronation);





    let swingSpeed = MasterData.max_speed || 0;
    let swingSpeedValue = String(swingSpeed) + " mph";

    // Update best swing speed
    if (swingSpeed > bestSwingSpeed) {
        bestSwingSpeed = swingSpeed;
    }

    // Calculate swing speed delta
    let speedDelta = calculateSpeedDelta(swingSpeed);

    // Update swing speed averages
    updateSpeedAverages(swingSpeed);

    // Get pronation speed and update averages
    let currentPronationSpeed = MasterData.pronation_speed || 0;
    updatePronationSpeedAverages(currentPronationSpeed);
    
    // Add pronation speed score to total scores array
    let pronationSpeedScore = Math.round((currentPronationSpeed / 1500) * 100);
    if (pronationSpeedScore > 100) pronationSpeedScore = 100;
    scoresArray.push(pronationSpeedScore);
    
    // Get contact values first (this sets currentContactYEuler and currentContactPronation)
    getContactYEuler(MasterData);
    getContactPronation(MasterData, SlaveData);
    
    // Add contact angle score to total scores array
    let contactAngleScore = calculateEulerScore(currentContactYEuler);
    scoresArray.push(contactAngleScore);
    
    // Add contact pronation score to total scores array
    let contactPronationScore = calculateContactPronationScore(currentContactPronation);
    scoresArray.push(contactPronationScore);
    
    updateTotalAvgScore();

    let formattedData = [
        {
            title: 'Wrist Pronation',
            value: String(Math.round(maxPronation)) + "°",
            delta: delta,
            avg: String(Math.round(averageYRotationScore)) + "°",
            best: String(Math.round(bestYRotationDifference)) + "°",
            score: String(Math.round(rotationScore)),
            label: ["0°", "100°"],
            proRange: "70° - 85°",
            tip: rotationTip,
            status: wristStatus,
            statusColor: wristStatusColor,
            sliderValue: wristSliderValue,
            sliderGradient: [0.70,0.75,0.85,0.90]
        },
        {
            title: 'Swing Speed',
            value: String(Math.round(swingSpeed)) + " mph",
            delta: speedDelta,
            avg: String(Math.round(averageSwingSpeed)) + " mph",
            best: String(Math.round(bestSwingSpeed)) + " mph",
            score: String(Math.round(calculateSwingScore(swingSpeed))),
            label: ["0mph", "120mph"],
            proRange: "80 mph +",   
            tip: getSwingSpeedTip(swingSpeed),
            status: calculateSwingStatus(swingSpeed),
            statusColor: calculateSwingStatusColor(swingSpeed),
            sliderValue: calculateSwingSliderValue(swingSpeed),
            sliderGradient: [0.8,0.85,1,1]
        },
        {
            title: 'Wrist Pronation Speed',
            value: getPronationSpeed(MasterData),
            delta: getPronationSpeedDelta(currentPronationSpeed),
            avg: getPronationSpeedAverage(),
            best: String(Math.round(bestPronationSpeed)) + "°/s",
            score: getPronationSpeedScore(currentPronationSpeed),
            label: ["0 °/s", "2000 °/s"],
            proRange: "1500+°/s",
            tip: getPronationSpeedTip(currentPronationSpeed),
            status: getPronationSpeedStatus(currentPronationSpeed),
            statusColor: getPronationSpeedStatusColor(currentPronationSpeed),
            sliderValue: getPronationSpeedSliderValue(currentPronationSpeed),
            sliderGradient: [0.75,0.8,1,1]
        },
        {
            title: 'Contact Face Angle',
            value: getContactYEuler(MasterData),
            delta: getYEulerDelta(),
            avg: getYEulerAverage(),
            best: getYEulerBest(),
            score: String(calculateEulerScore(currentContactYEuler)),
            label: ["0°", "120°"],
            proRange: "60° - 75°",
            tip: getEulerTip(currentContactYEuler),
            status: getEulerStatus(currentContactYEuler),
            statusColor: getEulerStatusColor(currentContactYEuler),
            sliderValue: getEulerSliderValue(currentContactYEuler),
            sliderGradient: [0.5,0.55,0.62,0.68]
        },
        {
            title: 'Contact Pronation',
            value: getContactPronation(MasterData, SlaveData),
            delta: getContactPronationDelta(),
            avg: getContactPronationAverage(),
            best: getContactPronationBest(),
            score: String(calculateContactPronationScore(currentContactPronation)),
            label: ["0°", "100°"],
            proRange: "50° - 75°",
            tip: getContactPronationTip(currentContactPronation),
            status: getContactPronationStatus(currentContactPronation),
            statusColor: getContactPronationStatusColor(currentContactPronation),
            sliderValue: getContactPronationSliderValue(currentContactPronation),
            sliderGradient: [0.50,0.55,0.75,0.80]
        },
        {
            title: 'Session Summary',
            timePlayed: Math.floor(timePlayed / 60) + "mins",
            totalServes: yRotationScores.length,
            totalScore: Math.round(totalAvgScore),
            averageWristScore: Math.round(averageWristScore),
            averageSwingSpeedScore: Math.round(averageSwingSpeedScore)
        }
    ];

    //console.log("formattedData:", formattedData);
    return formattedData;
};

// Function to get current grid scores
export const getCurrentGridScores = () => {
    return [
        { key: 'wrist_pronation' as const, label: 'Wrist Pronation', value: Math.round(averageWristScore) },
        { key: 'swing_speed' as const, label: 'Swing Speed', value: Math.round(averageSwingSpeedScore) },
        { key: 'pronation_speed' as const, label: 'Pronation Speed', value: 79 },
        { key: 'contact_timing' as const, label: 'Contact Timing', value: 79 },
    ];
};

processLiveData();