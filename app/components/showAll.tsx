// ShowAllCard: Component for the show all sessions button
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import color from "../colors";
import spacing from "../spacing";

export function ShowAllCard() {
    return (
        <View style={styles.showAllCard}>
            <Text style={styles.showAllText}>Show All Sessions</Text>
            <Ionicons name="chevron-forward" size={34} color={color.accentText} />
        </View>
    )
}

const styles = StyleSheet.create({
    showAllCard: {
        marginTop: spacing.m,
        backgroundColor: color.card,
        paddingHorizontal: spacing.m,
        paddingVertical: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 12,
        marginBottom: spacing.xl,
    },
    showAllText: {
        color: 'white',
        fontSize: 20,
        fontFamily: 'Inter-Medium',
    }
})