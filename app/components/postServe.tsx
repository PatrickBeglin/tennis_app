// PostServe: Gauge bar component shown during serve mode
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import color from "../colors";
import spacing from "../spacing";

type PostServeProps = {
    type: string;
    data: any;
    expanded: boolean;
    onToggle: () => void;
  };

export function PostServe({ type, data, expanded, onToggle }: PostServeProps) {

    const [collapsedMode, setCollapsedMode] = useState(true);

    const getDeltaColor = (delta: string) => {
        if (delta.startsWith('+')) {
          return "#00FF36";
        } else if (delta.startsWith('-')) {
          return "#FF0000";
        }
        return color.accentText;
      }

    return (
        <View>
          {collapsedMode ? (
            <>
            <View style={styles.card}>
                <View style={styles.doubleTitle}> 
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>{data.title}</Text>
                        <View style={styles.circleContainer}>
                            <View style={[styles.circle, { backgroundColor: data.statusColor }]} />
                            <Text style={styles.circleText}>{data.status}</Text>
                        </View>
                    </View>
                    <Text style={styles.value}>{data.value}</Text>
                </View>
                <View style={styles.sliderRow}>
                    <View style={styles.sliderTrackWrapper}>
                        <LinearGradient
                        colors={[color.accentGrey,  color.purple, color.purple, color.accentGrey]}
                        locations={data.sliderGradient}
                        start={[0, 0]}
                        end={[1, 0]}
                        style={styles.sliderTrack}
                        />
                        <View
                        style={[
                            styles.sliderThumb,
                            {
                            left: `${(data.sliderValue ?? 0) * 100}%`
                            }
                        ]}
                        />
                    </View>
                    </View>
                    <View style={styles.sliderLabelRow}>
                        <Text style={styles.sliderLabel}>{data.label[0]}</Text>
                        <Text style={styles.sliderLabel}>{data.label[1]}</Text>
                    </View>

                    <TouchableOpacity onPress={() => setCollapsedMode(!collapsedMode)}>
                    <View style={styles.detailContainer}>
                        <Text style={styles.detailsText}>More Details</Text>
                        <Ionicons name="chevron-down" size={14} color={color.accentText} />
                    </View>
                    </TouchableOpacity>
            </View>
            </>
          ) : (
            <>
<View style={styles.card}>
                <View style={styles.doubleTitle}> 
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>{data.title}</Text>
                        <View style={styles.circleContainer}>
                            <View style={[styles.circle, { backgroundColor: data.statusColor }]} />
                            <Text style={styles.circleText}>{data.status}</Text>
                        </View>
                    </View>
                    <Text style={styles.value}>{data.value}</Text>    
                </View>
                <View style={styles.sliderRow}>
                    <View style={styles.sliderTrackWrapper}>    
                        <LinearGradient
                        colors={[color.accentGrey,  color.purple, color.purple, color.accentGrey]}
                        locations={data.sliderGradient}
                        start={[0, 0]}
                        end={[1, 0]}
                        style={styles.sliderTrack}
                        />
                        <View
                        style={[
                            styles.sliderThumb,
                            {
                            left: `${(data.sliderValue ?? 0) * 100}%`
                            }
                        ]}
                        />
                    </View>
                    </View>

                    <View style={styles.sliderLabelRow}>
                        <Text style={styles.sliderLabel}>{data.label[0]}</Text>
                        <Text style={styles.sliderLabel}>{data.label[1]}</Text>
                    </View>
                    <View style={styles.proRangeContainer}>
                        <View style={styles.proRangeContainer2}>
                            <Text style={styles.proRangeText}>Pro Range: </Text>
                            <Text style={styles.proRange}>{data.proRange}</Text>
                        </View>
                        <View style={styles.deltaContainer}>
                            <Text style={[styles.deltaText, {color: getDeltaColor(data.delta)}]}>{data.delta}</Text>
                            <Text style={styles.deltaText2}> From last Serve</Text>
                        </View>
                    </View>
                    <View style={styles.expandedContainer}>
                        <View style={styles.expandedTextContainer1}>
                            <Text style={styles.expandedText}>Avg: </Text>
                            <Text style={styles.expandedTextN}>{data.avg}</Text>
                            <Text style={styles.expandedText}>Best: </Text>
                            <Text style={styles.expandedTextN}>{data.best}</Text>
                        </View>
                            <Text style={styles.expandedText2}>Score: {data.score}</Text>
                    </View>
                    <View style={styles.tipContainer}>
                        <Text style={styles.tipText}>
                            <Text style={styles.tipTitle}>Tip: </Text>
                            {data.tip}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => setCollapsedMode(!collapsedMode)}>
                    <View style={styles.collapseContainer}>
                        <Text style={styles.detailsText}>Collapse</Text>
                        <Ionicons name="chevron-up" size={14} color={color.accentText} />
                    </View>
                    </TouchableOpacity>
            </View>
            </>
          )}
        </View>
      );
}

const styles = StyleSheet.create({
    title: {
        color: "white",
        fontSize: 20,
        fontFamily: "Inter-Medium",
        marginRight: spacing.m,
    },
    proRange: {
        color: color.purple,
        fontSize: 16,
    },
    proRangeContainer: {
        marginTop: spacing.s,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    proRangeContainer2: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    proRangeText: {
        color: "white",
        fontSize: 16,
        fontFamily: "Inter-Regular",
    },
    label: {
        fontSize: 12,
    },
    card: {
        backgroundColor: color.card,
        borderRadius: 12,
        paddingTop: spacing.l,
        paddingBottom: spacing.l,
        paddingRight: spacing.m,
        paddingLeft: spacing.m,
        marginBottom: spacing.m
      },
    doubleTitle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.l,
    },
    circle: {
        width: 8,
        height: 8,
        borderRadius: 15,
        marginRight: spacing.m,
        backgroundColor: color.accentText,
    },
    circleText: {
        color: color.accentText,
        fontSize: 14,
        fontFamily: "Inter-Regular",
    },
    circleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sliderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 0,
    },
    sliderLabel: {
        color: color.accentText,
        fontSize: 10,
    },
    sliderTrackWrapper: {
        flex: 1,
        height: 16,
        justifyContent: 'center',
        position: 'relative',
    },
    sliderTrack: {
        width: '100%',
        height: 10,
        borderRadius: 8,
    },
    sliderThumb: {
        position: 'absolute',
        width: 6,
        height: 28,
        backgroundColor: 'white',
        borderRadius: 5,
        top: -7, // centers the thumb vertically
        zIndex: 2,
        borderWidth: 0.5,
        borderColor: "black",
    },
    sliderLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 0,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    value: {
        color: "white",
        fontSize: 24,
        fontFamily: "Inter-Medium",
    },
    deltaContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    deltaText: {
        color: "white",
        fontSize: 12,
        fontFamily: "Inter-Regular",
    },
    deltaText2: {
        color: color.accentText,
        fontSize: 12,
        fontFamily: "Inter-Regular",
    },
    detailContainer: {
        marginTop: spacing.s,
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    detailsText: {
        color: color.accentText,
        fontSize: 12,
        marginRight: spacing.s,
    },
    expandedContainer: {
        marginTop: spacing.m,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    expandedTextContainer1: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    expandedText: {
        color: color.accentText,
        fontSize: 16,
        fontFamily: "Inter-Regular",
    },
    expandedTextN: {
        color: "white",
        fontSize: 16,
        fontFamily: "Inter-Medium",
        paddingRight: spacing.l,
    },
    expandedText2: {
        color: "white",
        fontSize: 20,
        fontFamily: "Inter-medium",
    },
    tipContainer: {
        backgroundColor: color.cardLight,
        borderRadius: 12,
        justifyContent: 'center',
        padding: spacing.l,
        flexDirection: 'row',
        marginTop: spacing.m,
    },
    tipText: {
        color: "white",
        fontSize: 14,
        fontFamily: "Inter-Regular",
    },
    tipTitle: {
        color: color.purple,
        fontSize: 14,
        fontFamily: "Inter-Regular",
    },
    collapseContainer: {
        marginTop: spacing.m,
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
})