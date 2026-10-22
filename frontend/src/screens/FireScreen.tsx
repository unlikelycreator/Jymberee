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
import { ArrowLeft, Phone, AlertCircle, Info, Flame } from 'lucide-react-native';
import Popup from '../components/Popup';
import { takePhotoAndUpload } from '../utils/sendsos';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext'; 
import { RootStackParamList } from '../navigation/AppNavigator';

type FireScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'FireScreen'>;
type FireScreenRouteProp = RouteProp<RootStackParamList, 'FireScreen'>;


type ExtendedRootStackParamList = RootStackParamList & {
  EmergencyContacts: undefined;
};

interface Props {
  navigation: FireScreenNavigationProp;
  route: FireScreenRouteProp;
}

const { width } = Dimensions.get('window');

const FireScreen: React.FC<Props> = ({ navigation }) => {
  const { emergencyContacts } = useAuth(); 
  const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false);
  const [popupTitle, setPopupTitle] = useState<string>('');
  const [popupMessage, setPopupMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false); 
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);

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

  const callFireBrigade = (): void => {
    const fireBrigadeNumber = '101';
    Linking.openURL(`tel:${fireBrigadeNumber}`).catch((err: Error) => {
      console.error('Failed to call the fire brigade:', err);
      Alert.alert('Error', 'Unable to call the fire brigade. Please try again.', [
        { text: 'Retry', onPress: callFireBrigade },
        { text: 'Cancel', style: 'cancel' },
      ]);
    });
  };

  const handleSendSOS = async (): Promise<void> => {
    if (!checkEmergencyContacts()) {
      return;
    }

    setLoading(true);
    setCameraLoading(true);
    try {
      const result = await takePhotoAndUpload({ description: 'Fire emergency reported', showPopup });
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

  const openFireSafetyTips = (): void => {
    navigation.navigate('fire-safety-tips');
  };

  const goToHome = (): void => {
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={goToHome}
        activeOpacity={0.7}
        accessible
        accessibilityLabel="Go back to home"
        accessibilityRole="button"
      >
        <ArrowLeft size={28} color="#ffffff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Flame size={60} color="#FF4500" style={styles.headerIcon} />
        <Text style={styles.header}>Fire Emergency Help</Text>
        <Text style={styles.description}>
          If you witness a fire, report it immediately to the fire brigade. Stay calm and follow safety protocols.
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#FF4500' }, (loading || cameraLoading) && styles.buttonDisabled]}
          onPress={callFireBrigade}
          activeOpacity={0.7}
          disabled={loading || cameraLoading}
          accessible
          accessibilityLabel="Call Fire Brigade"
          accessibilityRole="button"
        >
          <Phone size={24} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Call Fire Brigade</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#DC143C' }, (loading || cameraLoading) && styles.buttonDisabled]}
          onPress={handleSendSOS}
          activeOpacity={0.7}
          disabled={loading || cameraLoading}
          accessible
          accessibilityLabel="Report Fire Emergency"
          accessibilityRole="button"
        >
          {loading || cameraLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <AlertCircle size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Report Fire</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={openFireSafetyTips}
          activeOpacity={0.7}
          accessible
          accessibilityLabel="View Fire Safety Tips"
          accessibilityRole="link"
        >
          <Info size={20} color="#FF4500" style={styles.linkIcon} />
          <Text style={styles.linkText}>View Fire Safety Tips</Text>
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
    backgroundColor: '#FFF8F5',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 20,
    zIndex: 10,
    backgroundColor: '#FF4500',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
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
    color: '#DC143C',
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  description: {
    fontSize: 16,
    color: '#4A4A4A',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
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
    color: '#FF4500',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
export default FireScreen;