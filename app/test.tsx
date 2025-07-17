import { StyleSheet, Text, View } from "react-native";


export default function AboutScreen() {
  return (
    <View
      style = {styles.container}
    >
      <Text style={styles.text}>this is the test screen</Text>
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