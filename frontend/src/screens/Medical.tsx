import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { ArrowLeft, Phone, HeartPulse, Info } from 'lucide-react-native';
import Popup from '../components/Popup';
import { takePhotoAndUpload } from '../utils/sendsos';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext'; 
import { RootStackParamList } from '../navigation/AppNavigator';

type MedicalScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type ExtendedRootStackParamList = RootStackParamList & {
  EmergencyContacts: undefined;
};

const { width } = Dimensions.get('window');

const MedicalScreen: React.FC = () => {
  const { emergencyContacts } = useAuth(); 
  const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false);
  const [popupTitle, setPopupTitle] = useState<string>('');
  const [popupMessage, setPopupMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const navigation = useNavigation<StackNavigationProp<ExtendedRootStackParamList>>();

  const showPopup = (title: string, message: string): void => {
    setPopupTitle(title);
    setPopupMessage(message);
    setIsPopupVisible(true);
  };

  const hidePopup = (): void => {
    setIsPopupVisible(false);
  };

  const checkEmergencyContacts = (): boolean => {
    if (emergencyContacts.length === 0) {
      Alert.alert(
        'No Emergency Contacts',
        'You need to add at least one emergency contact before reporting an emergency.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Contact',
            onPress: () => navigation.navigate('EmergencyContacts'),
          },
        ]
      );
      return false;
    }
    return true;
  };

  const callMedicalEmergency = (): void => {
    const medicalEmergencyNumber = '108';
    Linking.openURL(`tel:${medicalEmergencyNumber}`).catch((err: Error) => {
      console.error('Failed to call medical emergency:', err);
      Alert.alert(
        'Error',
        'Unable to call medical emergency services. Please try again.',
        [
          { text: 'Retry', onPress: callMedicalEmergency },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    });
  };

  const handleSendSOS = async (): Promise<void> => {
    if (!checkEmergencyContacts()) {
      return;
    }

    setLoading(true);
    setCameraLoading(true);
    try {
      const result = await takePhotoAndUpload({ description: 'Medical Emergency Reported', showPopup });
      if (!result?.imageUploaded) {
        showPopup('Success', 'SOS sent without image.');
      }
    } catch (error) {
      console.error('Error in handleSendSOS:', error);
      showPopup('Error', 'Failed to send SOS. Please try again.');
    } finally {
      setLoading(false);
      setCameraLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('Home')}
        activeOpacity={0.7}
        accessible
        accessibilityLabel="Go back to home"
        accessibilityRole="button"
      >
        <ArrowLeft size={28} color="#ffffff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <HeartPulse size={60} color="#26A69A" style={styles.headerIcon} />
        <Text style={styles.header}>Medical Emergency Help</Text>
        <Text style={styles.description}>
          If you encounter a medical emergency, contact emergency services immediately. Stay calm and provide clear information.
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#26A69A' }, (loading || cameraLoading) && styles.buttonDisabled]}
          onPress={callMedicalEmergency}
          activeOpacity={0.7}
          disabled={loading || cameraLoading}
          accessible
          accessibilityLabel="Call Medical Emergency"
          accessibilityRole="button"
        >
          <Phone size={24} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Call Medical Emergency</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#34C759' }, (loading || cameraLoading) && styles.buttonDisabled]}
          onPress={handleSendSOS}
          activeOpacity={0.7}
          disabled={loading || cameraLoading}
          accessible
          accessibilityLabel="Report Medical Emergency"
          accessibilityRole="button"
        >
          {loading || cameraLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <HeartPulse size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Report Medical Emergency</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('medical-safety-tips')}
          activeOpacity={0.7}
          accessible
          accessibilityLabel="View Medical Safety Tips"
          accessibilityRole="link"
        >
          <Info size={20} color="#26A69A" style={styles.linkIcon} />
          <Text style={styles.linkText}>View Medical Safety Tips</Text>
        </TouchableOpacity>
      </ScrollView>

      <Popup
        isVisible={isPopupVisible}
        title={popupTitle}
        message={popupMessage}
        onClose={hidePopup}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', 
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 20,
    zIndex: 10,
    backgroundColor: '#00897B', 
    borderRadius: 12,
    padding: 10,
    shadowColor: '#00000029',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  headerIcon: {
    marginBottom: 15,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  description: {
    fontSize: 16,
    color: '#666666', 
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: width - 40,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#00000029',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  linkIcon: {
    marginRight: 8,
  },
  linkText: {
    color: '#26A69A', 
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default MedicalScreen;