import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import color from '../colors';
import spacing from '../spacing';

interface SaveSessionModalProps {
  visible: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function SaveSessionModal({
  visible,
  onSave,
  onDiscard,
  onCancel,
}: SaveSessionModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <BlurView intensity={20} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>Save session?</Text>
          <Text style={styles.modalDescription}>
            Would you like to save this session to your history?
          </Text>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]} 
              onPress={onSave}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.discardButton]} 
              onPress={onDiscard}
            >
              <Text style={styles.discardButtonText}>Discard</Text>
            </TouchableOpacity>
          </View>
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