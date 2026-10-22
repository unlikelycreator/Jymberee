import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { ArrowLeft, AlertOctagon } from 'lucide-react-native';
import Popup from '../components/Popup';
import { takePhotoAndUpload } from '../utils/sendsos';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext'; 
import { RootStackParamList } from '../navigation/AppNavigator';

type EmergencyScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EmergencyScreen'>;
type EmergencyScreenRouteProp = RouteProp<RootStackParamList, 'EmergencyScreen'>;

type ExtendedRootStackParamList = RootStackParamList & {
  EmergencyContacts: undefined;
};

interface Props {
  navigation: EmergencyScreenNavigationProp;
  route: EmergencyScreenRouteProp;
}

const { width } = Dimensions.get('window');

const theme = {
  colors: {
    background: '#FFF8F5',
    textPrimary: '#4A4A4A',
    textSecondary: '#757575',
    border: 'rgba(0, 0, 0, 0.1)',
    disabled: '#9CA3AF',
    white: '#FFFFFF',
    firePrimary: '#D80B1E',
    fireAccent: '#FF4500',
    medicalPrimary: '#2563EB',
    medicalAccent: '#3B82F6',
    rapePrimary: '#D32F2F',
    rapeAccent: '#B30818',
    theftPrimary: '#B91C1C',
    theftAccent: '#DC2626',
    emergencyPrimary: '#D81B60',
    emergencyAccent: '#EC4899',
  },
  typography: {
    header: { fontSize: 28, fontWeight: '700' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    button: { fontSize: 18, fontWeight: '600' as const },
  },
  spacing: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 },
  borderRadius: { small: 8, medium: 12, large: 16 },
};

const OtherEmergencyScreen: React.FC<Props> = ({ navigation }) => {
  const { emergencyContacts } = useAuth(); 
  const [crimeDetails, setCrimeDetails] = useState<string>('');
  const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false);
  const [popupTitle, setPopupTitle] = useState<string>('');
  const [popupMessage, setPopupMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false); 
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [buttonScale] = useState(new Animated.Value(1));

  const animateButton = (toValue: number) => {
    Animated.spring(buttonScale, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  };

  const showPopup = (title: string, message: string, autoCloseDuration: number | null = null) => {
    setPopupTitle(title);
    setPopupMessage(message);
    setIsPopupVisible(true);
    if (autoCloseDuration) {
      setTimeout(() => setIsPopupVisible(false), autoCloseDuration);
    }
  };

  const hidePopup = () => setIsPopupVisible(false);

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

    if (!crimeDetails.trim()) {
      showPopup('Error', 'Please provide a description for the emergency.');
      return;
    }

    setLoading(true);
    setCameraLoading(true);
    try {
      const result = await takePhotoAndUpload({ description: crimeDetails, showPopup });
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

  const goToHome = () => {
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={goToHome}
        activeOpacity={0.7}
        accessible
        accessibilityLabel="Go back to main screen"
        accessibilityRole="button"
      >
        <ArrowLeft size={28} color={theme.colors.white} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <AlertOctagon size={60} color={theme.colors.emergencyPrimary} style={styles.headerIcon} />
        <Text style={styles.header}>Emergency Help</Text>
        <Text style={styles.description}>
          If you are experiencing or witnessing an emergency, report it immediately. Provide details to assist emergency services.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Describe the emergency (e.g., location, details)"
          placeholderTextColor={theme.colors.textSecondary}
          value={crimeDetails}
          onChangeText={setCrimeDetails}
          multiline
          numberOfLines={4}
          accessibilityLabel="Enter emergency details"
          textAlignVertical="top"
        />

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.reportButton, (loading || cameraLoading) && styles.disabledButton]}
            onPress={handleSendSOS}
            onPressIn={() => animateButton(0.95)}
            onPressOut={() => animateButton(1)}
            disabled={loading || cameraLoading}
            activeOpacity={0.7}
            accessible
            accessibilityLabel="Report Emergency"
            accessibilityRole="button"
          >
            {loading || cameraLoading ? (
              <ActivityIndicator size="large" color={theme.colors.white} />
            ) : (
              <>
                <AlertOctagon size={24} color={theme.colors.white} style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Report Emergency</Text>
              </>
            )}
          </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: theme.spacing.md,
    zIndex: 10,
    backgroundColor: theme.colors.emergencyPrimary,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  headerIcon: {
    marginBottom: theme.spacing.md,
  },
  header: {
    ...theme.typography.header,
    color: theme.colors.emergencyPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 24,
  },
  input: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.white,
    marginBottom: theme.spacing.lg,
    textAlignVertical: 'top',
    width: width - theme.spacing.md * 2,
    minHeight: 100,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.emergencyPrimary,
    width: width - theme.spacing.md * 2,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonIcon: {
    marginRight: theme.spacing.sm,
  },
  buttonText: {
    ...theme.typography.button,
    color: theme.colors.white,
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: theme.colors.disabled,
    opacity: 0.6,
  },
});

export default OtherEmergencyScreen;