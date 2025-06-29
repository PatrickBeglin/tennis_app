import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import color from '../colors';
import spacing from '../spacing';

export default function Index() {
  return (
    <View style={styles.screen}>
      <View style = {styles.header}>
        <View style={styles.profile}>
          <View style={styles.avatar} />
          <Text style={styles.name}>Patrick</Text>
        </View>

        <TouchableOpacity style={styles.connectButton}>
          <Ionicons name="bluetooth" size={18} color="white"/>
          <Text style={styles.connectText}>Connect</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Play now</Text>

        <View style={styles.cardRow}>
          <View style={styles.cardL}>
            <View style={styles.imagePlaceholder} />
            <Text style={styles.cardTitleL}>General Mode</Text>
            <Text style={styles.cardDescription}>Play continuously and track metrics across...</Text>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Start Session</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardR}>
            <View style={styles.imagePlaceholder} />
            <Text style={styles.cardTitleR}>Serve Mode</Text>
            <Text style={styles.cardDescription}>Gather instant feedback on your serve</Text>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Start Session</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
  </View>
  );
}


const styles = StyleSheet.create({
  header: {
    width: '100%',
    paddingHorizontal: 19,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'black', 
  },

  profile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#343335',
    marginRight: 12,
  },

  name: {
    fontFamily: 'Inter-Regular',
    color: 'white',
    fontSize: 14,
  },

  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#343335',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },

  connectText: {
    color: 'white',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginLeft: 8,
  },

  screen: {
    flex: 1,
    backgroundColor: "black",
  },







  scroll: {
    flex: 1,
    backgroundColor: "black",
  },

  container: {
    paddingHorizontal: 19,
    paddingBottom: spacing.m,
  },

  sectionTitle: {
    color: "white",
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: spacing.m,
  },

  cardRow: {
    flexDirection: "row",
  },

  cardL: {
    marginRight: "2%",
    backgroundColor: color.card,
    borderRadius: 12,
    padding: 12,
    width: "49%",
    borderWidth: 0.5,
    borderColor: color.purple, // placeholder for gradient effect
  },

    cardR: {
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    padding: 12,
    width: "49%",
    borderWidth: 0.5,
    borderColor: color.blue, // placeholder for gradient effect
  },

  imagePlaceholder: {
    aspectRatio: 1,
    backgroundColor: color.cardLight,
    borderRadius: 6,
    marginBottom: 16,
  },

  cardTitleR: {
    fontFamily: 'Inter-Medium',
    color: color.blue,
    fontSize: 16,
    marginBottom: 2,
  },

  cardTitleL: {
    fontFamily: 'Inter-Medium',
    color: color.purple,
    fontSize: 16,
    marginBottom: 2,
  },

  cardDescription: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 16,
  },

  button: {
    borderColor: "#aaa",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 4,
  },

  buttonText: {
    fontFamily: "Inter-Bold",
    color: "white",
    fontSize: 14,
  },

})