import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import color from '../colors';
import spacing from '../spacing';
import { useGlobalBLE } from '../utils/useBLE';

interface CalibrateModalProps {
  visible: boolean;
  onCancel: () => void;
}

export default function CalibrateModal({
  visible,
  onCancel,
}: CalibrateModalProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const { sendPingToMaster } = useGlobalBLE();
  
  const onCalibrate = async () => {
    console.log("Calibrate button pressed!");
    try {
      // Send single byte 0x01
      await sendPingToMaster("\x01");
      console.log("Ping sent successfully!");
      setIsSuccess(true);
    } catch (error) {
      console.error("Failed to send ping:", error);
    }
  }

  const onRecalibrate = () => {
    setIsSuccess(false); // Go back to calibration screen
  }

  const onFinish = () => {
    setIsSuccess(false); // Reset state
    onCancel(); // Close modal
  }

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
    >
      <BlurView intensity={20} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          {!isSuccess ? (
            // Calibration screen
            <>
              <Text style={styles.modalTitle}>Calibrate Pronation</Text>
              <Text style={styles.modalDescription}>
                With your palm up straighten your right arm out in front of you and then press calibrate.
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]} 
                  onPress={onCalibrate}
                >
                  <Text style={styles.saveButtonText}>Calibrate</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.discardButton]} 
                  onPress={onCancel}
                >
                  <Text style={styles.discardButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // Success screen
            <>
              <Ionicons name="checkmark-circle" size={60} color="#4CAF50" style={styles.successIcon} />
              <Text style={styles.modalTitle}>Calibration Complete!</Text>
              <Text style={styles.modalDescription}>
                Your pronation has been calibrated successfully.
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]} 
                  onPress={onFinish}
                >
                  <Text style={styles.saveButtonText}>Finish</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.discardButton]} 
                  onPress={onRecalibrate}
                >
                  <Text style={styles.discardButtonText}>Recalibrate</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    backgroundColor: color.card,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
  },
  successIcon: {
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 10,
    color: 'white',
    marginTop: 10,
  },
  modalDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 20,
    color: color.accentText,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
    marginBottom: 20,
  },
  modalButton: {
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.l,
    borderRadius: 12,
  },
  saveButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.m,
    backgroundColor: color.cardLight,
  },
  saveButtonText: {
    textAlign: 'center',
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  discardButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.m,
    backgroundColor: color.card,
  },
  discardButtonText: {
    textAlign: 'center',
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
});