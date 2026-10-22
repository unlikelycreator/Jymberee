import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
  ScrollView,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { ArrowLeft, Phone, ShieldAlert, Info } from 'lucide-react-native';
import Popup from '../components/Popup';
import { takePhotoAndUpload } from '../utils/sendsos';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';

type RootStackParamList = {
  Home: undefined;
  'safety-tips': undefined;
  EmergencyContacts: undefined;
};

type CrimeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface CrimeScreenProps {
  navigation: CrimeScreenNavigationProp;
}

const { width } = Dimensions.get('window');

const theme = {
  colors: {
    primary: '#1E3A8A',
    accent: '#F97316',
    background: '#F3F4F6',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    border: 'rgba(0, 0, 0, 0.05)',
    disabled: '#9CA3AF',
    white: '#FFFFFF',
  },
  typography: {
    header: { fontSize: 28, fontWeight: '700' as '700' },
    body: { fontSize: 16, fontWeight: '400' as '400' },
    button: { fontSize: 18, fontWeight: '600' as '600' },
  },
  spacing: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 },
  borderRadius: { small: 8, medium: 12, large: 16 },
};

const CrimeScreen: React.FC<CrimeScreenProps> = ({ navigation }) => {
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

  const callPolice = () => {
    const emergencyNumber = '112';
    Linking.openURL(`tel:${emergencyNumber}`).catch((err: Error) => {
      console.error('Failed to call the police:', err);
      showPopup('Error', 'Unable to call the police. Please try again.');
    });
  };

  const handleSendSOS = async (): Promise<void> => {
    if (!checkEmergencyContacts()) {
      return;
    }

    setLoading(true);
    setCameraLoading(true);
    try {
      const description = crimeDetails.trim() || 'Theft Emergency Reported'; 
      const result = await takePhotoAndUpload({ description, showPopup });
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
        accessibilityLabel="Go back to Dashboard screen"
        accessibilityRole="button"
      >
        <ArrowLeft size={28} color={theme.colors.white} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <ShieldAlert size={60} color={theme.colors.primary} style={styles.headerIcon} />
        <Text style={styles.header}>Theft Emergency</Text>
        <Text style={styles.description}>
          If you witness or are a victim of a theft, report it immediately. Provide details to assist emergency services.
        </Text>

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }, (loading || cameraLoading) && styles.disabledButton]}
            onPress={callPolice}
            onPressIn={() => animateButton(0.95)}
            onPressOut={() => animateButton(1)}
            disabled={loading || cameraLoading}
            activeOpacity={0.7}
            accessible
            accessibilityLabel="Call Police"
            accessibilityRole="button"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Phone size={24} color={theme.colors.white} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Call Police (112)</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <TextInput
          style={styles.input}
          placeholder="Describe the theft (e.g., location, type)"
          placeholderTextColor={theme.colors.textSecondary}
          value={crimeDetails}
          onChangeText={setCrimeDetails}
          multiline
          numberOfLines={4}
          accessibilityLabel="Enter theft details"
          textAlignVertical="top"
        />

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.accent }, (loading || cameraLoading) && styles.disabledButton]}
            onPress={handleSendSOS}
            onPressIn={() => animateButton(0.95)}
            onPressOut={() => animateButton(1)}
            disabled={loading || cameraLoading}
            activeOpacity={0.7}
            accessible
            accessibilityLabel="Report Theft"
            accessibilityRole="button"
          >
            {loading || cameraLoading ? (
              <ActivityIndicator size="large" color={theme.colors.white} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ShieldAlert size={24} color={theme.colors.white} style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Report Theft</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('safety-tips')}
          activeOpacity={0.7}
          accessible
          accessibilityLabel="View Safety Tips"
          accessibilityRole="link"
        >
          <Info size={20} color={theme.colors.primary} style={styles.linkIcon} />
          <Text style={styles.linkText}>View Safety Tips</Text>
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
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: theme.spacing.md,
    zIndex: 10,
    backgroundColor: theme.colors.primary,
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
    color: theme.colors.textPrimary,
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
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  disabledButton: {
    backgroundColor: theme.colors.disabled,
    opacity: 0.6,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  linkIcon: {
    marginRight: theme.spacing.sm,
  },
  linkText: {
    ...theme.typography.button,
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
});

export default CrimeScreen;