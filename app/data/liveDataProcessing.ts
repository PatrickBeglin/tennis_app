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

// Helper function to calculate max wrist pronation using quaternions
const calculateMaxWristPronation = (MasterData: any, SlaveData: any, dataLength: number): number => {
    let maxPronation = 0;

    // Debug: Log first sample to check sensor alignment
    if (dataLength > 0) {
        const w = MasterData.swing[0]; // wrist
        const u = SlaveData.swing[0];  // upper arm
        console.log("DEBUG - First sample quaternions:");
        console.log("Wrist (w,x,y,z):", w.w.toFixed(4), w.x.toFixed(4), w.y.toFixed(4), w.z.toFixed(4));
        console.log("Upper arm (w,x,y,z):", u.w.toFixed(4), u.x.toFixed(4), u.y.toFixed(4), u.z.toFixed(4));
        
        // Check if sensors might be 180° rotated (inverse quaternions)
        const dot = w.w * u.w + w.x * u.x + w.y * u.y + w.z * u.z;
        console.log("Dot product (should be ~1.0 if aligned, ~-1.0 if 180° off):", dot.toFixed(4));
        
        if (dot < -0.5) {
            console.log("WARNING: Sensors appear to be 180° rotated! Consider inverting one sensor.");
        }
    }

    // Helper function to multiply quaternions
    const quaternionMultiply = (q1: any, q2: any) => {
        return {
            w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
            x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
            y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
            z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w
        };
    };

    // Helper function to get quaternion conjugate (inverse for unit quaternions)
    const quaternionConjugate = (q: any) => {
        return { w: q.w, x: -q.x, y: -q.y, z: -q.z };
    };

    for (let i = 0; i < dataLength; i++) {
        const wristQuat = MasterData.swing[i]; // wrist (already normalized)
        const upperArmQuat = SlaveData.swing[i];  // upper arm (already normalized)

        // Calculate relative quaternion: relativeQuat = upperArmConjugate * wristQuat
        // This gives us the rotation from upper arm to wrist
        const upperArmConjugate = quaternionConjugate(upperArmQuat);
        const relativeQuat = quaternionMultiply(upperArmConjugate, wristQuat);

        // Use Y-axis rotation as the primary pronation axis (most reliable for wrist pronation)
        // Y-axis typically represents wrist pronation/supination
        const pronationAngle = Math.atan2(
            2 * (relativeQuat.w * relativeQuat.y + relativeQuat.x * relativeQuat.z),
            1 - 2 * (relativeQuat.y * relativeQuat.y + relativeQuat.z * relativeQuat.z)
        ) * (180 / Math.PI);

        // Track maximum absolute pronation
        const absPronation = Math.abs(pronationAngle);
        if (absPronation > maxPronation) {
            maxPronation = absPronation;
        }
    }

    console.log("Wrist pronation angle:", maxPronation);
    return maxPronation;
};




// Helper function to get rotation tip
const getRotationTip = (maxYRotationDifference: number): string => {
    if (maxYRotationDifference < 80) {
        return "Try to finish your swing with more wrist pronation at impact.";
    }
    else if (maxYRotationDifference > 120) {
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
    if (maxYRotationDifference < 40) {
        return { status: "Poor", color: "#FF0000" };
    } else if (maxYRotationDifference < 60) {
        return { status: "Ok", color: "#FFE400" };
    } else if (maxYRotationDifference < 80) {
        return { status: "Good", color: "#B6FF7A" };
    } else if (maxYRotationDifference < 120) {
        return { status: "Excellent", color: "#00FF36" };
    } else if (maxYRotationDifference < 180) {
        return { status: "Injury level", color: "#FF0000" };
    } else {
        return { status: "Impossible", color: "#FF0000" };
    }
};

// Helper function to calculate slider value
const calculateSliderValue = (maxYRotationDifference: number): number => {
    return maxYRotationDifference / 180;
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
        return '#FF0000';
    } else if (swingSpeed < 50) {
        return '#FFE400';
    } else if (swingSpeed < 80) {
        return '#B6FF7A';
    } else {
        return '#00FF36';
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
    
    if (maxPronation > bestYRotationDifference) {
        bestYRotationDifference = maxPronation;
    }
    console.log("Wrist pronation angle:", maxPronation);

    let wristValue = String((Math.round(maxPronation)) + "°");

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


    let formattedData = [
        {
            title: 'Wrist Pronation',
            value: String(Math.round(maxPronation)) + "°",
            delta: delta,
            avg: String(Math.round(averageYRotationScore)) + "°",
            best: String(Math.round(bestYRotationDifference)) + "°",
            score: String(Math.round(rotationScore)),
            label: ["0°", "180°"],
            proRange: "80° - 120°",
            tip: rotationTip,
            status: wristStatus,
            statusColor: wristStatusColor,
            sliderValue: wristSliderValue,
            sliderGradient: [0.44,0.5,0.6,0.66]
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
            title: 'Contact Timing',
            value: "0.00s",
            delta: "0.00s",
            avg: "0.00s",
            best: "0.00s",
            score: "0",
            label: ["0.00s", "0.00s"],
            proRange: "0.00s - 0.00s",
            tip: "No data available",
            status: "No Data",
            statusColor: "#666666",
            sliderValue: 0,
            sliderGradient: [0.8,0.85,1,1]
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
        { key: 'torso_rotation' as const, label: 'Torso Rotation', value: 79 }, // mock data for now
        { key: 'shot_timing' as const, label: 'Shot Timing', value: 79 }, // mock data for now
        { key: 'swing_speed' as const, label: 'Swing Speed', value: Math.round(averageSwingSpeedScore) },
    ];
};

processLiveData();