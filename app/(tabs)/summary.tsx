import { StyleSheet, Text, View } from "react-native";
import { useSensorData } from "../utils/useBLE";



export default function AboutScreen() {
  const rawData = useSensorData();
  const sensorData = JSON.stringify(rawData);
  return (
    <View
      style = {styles.container}
    >
      <Text style={styles.text}>{sensorData}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black"
  },
  text: {
    color: "red",
    fontSize: 24,
    fontWeight: "bold"
  }
})