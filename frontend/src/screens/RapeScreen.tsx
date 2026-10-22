import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { takePhotoAndUpload } from '../utils/sendsos';
import Popup from '../components/Popup';
import { ArrowLeft, Phone, AlertTriangle, Info } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

type RootStackParamList = {
  Dashboard: undefined;
  EmergencyContacts: undefined;
  [key: string]: undefined;
};

type RapeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface RapeScreenProps {
  navigation: RapeScreenNavigationProp;
}

const { width } = Dimensions.get('window');

const RapeScreen: React.FC<RapeScreenProps> = ({ navigation }) => {
  const { emergencyContacts } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [sosScale] = useState(new Animated.Value(1));
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sosScale, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(sosScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

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

  const handleSendSOS = async (): Promise<void> => {
    if (!checkEmergencyContacts()) {
      return;
    }

    setLoading(true);
    setCameraLoading(true);
    try {
      const result = await takePhotoAndUpload({ description: 'Rape Emergency Reported', showPopup });
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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('Home')}
        activeOpacity={0.7}
        accessible
        accessibilityLabel="Go back to home"
        accessibilityRole="button"
      >
        <ArrowLeft size={28} color={COLORS.white} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim }]}>
          <AlertTriangle size={60} color={COLORS.primary} style={styles.headerIcon} />
          <Text style={styles.header}>Emergency Support</Text>
          <Text style={styles.description}>
            You are not alone. Use the SOS button to report an emergency or call for immediate help.
          </Text>

          <Animated.View style={[styles.sosButtonContainer, { transform: [{ scale: sosScale }] }]}>
            <TouchableOpacity
              style={[styles.sosButton, (loading || cameraLoading) && styles.buttonDisabled]}
              onPress={handleSendSOS}
              disabled={loading || cameraLoading}
              activeOpacity={0.7}
              accessible
              accessibilityLabel="Send SOS Alert"
              accessibilityRole="button"
            >
              {(loading || cameraLoading) ? (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={COLORS.white} />
                </View>
              ) : (
                <>
                  <AlertTriangle size={28} color={COLORS.white} style={styles.buttonIcon} />
                  <Text style={styles.sosText}>SEND SOS</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <TouchableOpacity
              style={[styles.button, styles.policeButton]}
              onPress={() => Linking.openURL('tel:112')}
              activeOpacity={0.7}
              accessible
              accessibilityLabel="Call Police"
              accessibilityRole="button"
            >
              <Phone size={24} color={COLORS.white} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Call Police (112)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: COLORS.secondary }]}
              onPress={() => Linking.openURL('tel:181')}
              activeOpacity={0.7}
              accessible
              accessibilityLabel="Call Women’s Helpline"
              accessibilityRole="button"
            >
              <Phone size={24} color={COLORS.white} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Women’s Helpline (181)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support Resources</Text>
            <TouchableOpacity
              style={styles.resourceButton}
              onPress={() => Linking.openURL('https://ncw.nic.in/')}
              activeOpacity={0.7}
              accessible
              accessibilityLabel="Visit National Commission for Women"
              accessibilityRole="link"
            >
              <Info size={20} color={COLORS.primary} style={styles.buttonIcon} />
              <Text style={styles.resourceText}>National Commission for Women</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resourceButton}
              onPress={() => Linking.openURL('https://wcd.nic.in/')}
              activeOpacity={0.7}
              accessible
              accessibilityLabel="Visit Women & Child Development"
              accessibilityRole="link"
            >
              <Info size={20} color={COLORS.primary} style={styles.buttonIcon} />
              <Text style={styles.resourceText}>Women & Child Development</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Safety Tips</Text>
            <View style={styles.tipContainer}>
              <Text style={styles.tipText}>• Find a safe place immediately</Text>
              <Text style={styles.tipText}>• Avoid washing or changing clothes</Text>
              <Text style={styles.tipText}>• Seek medical help as soon as possible</Text>
            </View>
          </View>
        </Animated.View>
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

const COLORS = {
  primary: '#C62828',
  secondary: '#6A1B9A',
  police: '#003087',
  background: '#F7F7FA',
  textPrimary: '#212121',
  textSecondary: '#616161',
  white: '#FFFFFF',
  border: 'rgba(0, 0, 0, 0.08)',
  accent: '#0288D1',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 16,
    zIndex: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 40,
  },
  contentWrapper: {
    width: width - 32,
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: 16,
  },
  header: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  section: {
    width: '100%',
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  policeButton: {
    backgroundColor: COLORS.police,
    shadowColor: COLORS.police,
    shadowOpacity: 0.3,
    elevation: 6,
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  resourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resourceText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'left',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  tipContainer: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tipText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginVertical: 6,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  sosButtonContainer: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 50,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative', 
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  sosText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    letterSpacing: 1,
  },
  loadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 50,
    opacity: 0.9,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default RapeScreen;