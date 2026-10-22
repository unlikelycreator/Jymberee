import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import PhoneInput, { ICountry, isValidPhoneNumber } from 'react-native-international-phone-number';
import api from '../utils/api';
import { RootStackParamList } from '../navigation/AppNavigator';

type ForgotPasswordNavigationProp = StackNavigationProp<RootStackParamList, 'ForgotPassword'>;

interface ForgotPasswordResponse {
  message: string;
}

const ForgotPasswordScreen: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const navigation = useNavigation<ForgotPasswordNavigationProp>();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleFocus = (field: string) => setFocusedInput(field);
  const handleBlur = () => setFocusedInput(null);

  const handleForgotPassword = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!phoneNumber || !selectedCountry) {
        setError('Please enter a valid phone number with country code');
        return;
      }
      const formattedPhoneNumber = `${selectedCountry?.idd.root ?? ''}${phoneNumber.replace(/\s+/g, '')}`;
      if (!/^\+[1-9]\d{1,14}$/.test(formattedPhoneNumber)) {
        setError('Please enter a valid phone number with country code (e.g., +1234567890)');
        return;
      }
      if (!isValidPhoneNumber(phoneNumber, selectedCountry)) {
        setError('Please enter a valid phone number for the selected country');
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        setError('Please enter a valid email');
        return;
      }

      const response = await api.post<ForgotPasswordResponse>('/auth/forgot-password', {
        phoneNumber: formattedPhoneNumber,
        email,
      });
      if (response.status === 200) {
        setSuccess(response.data.message);
      } else {
        setError(response.data.message || 'Failed to send reset instructions');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to send reset instructions. Please try again.');
      console.log('Forgot password error:', error.message);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 2000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.contentContainer}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/images/loginf.png')}
                style={styles.logoSize}
                resizeMode="contain"
                accessibilityLabel="Jymberee Logo"
              />
            </View>
            <View style={styles.formContainer}>
              <View style={styles.header}>
                <Text style={styles.headerText}>Forgot Password</Text>
                <Text style={styles.subHeaderText}>
                  Enter your phone number and email to receive a password reset code for{' '}
                  <Text style={styles.brand}>Jymberee</Text>.
                </Text>
              </View>

              <View style={[styles.inputContainerPhone, focusedInput === 'phone' && styles.inputContainerFocused]}>
                <PhoneInput
                  defaultCountry="IN"
                  value={phoneNumber}
                  phoneInputStyles={{
                    container: {
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#D1D5DB',
                      borderRadius: 12,
                      height: 56,
                    },
                    flagContainer: {
                      borderBottomLeftRadius: 12,
                      backgroundColor: '#F9FAFB',
                      justifyContent: 'center',
                      height: 54,
                    },
                    caret: {
                      color: '#1F2937',
                      fontSize: 16,
                    },
                    divider: {
                      backgroundColor: '#E5E7EB',
                      width: 1,
                      marginHorizontal: 8,
                    },
                    callingCode: {
                      fontSize: 16,
                      color: '#1F2937',
                      fontWeight: '500',
                    },
                    input: {
                      color: '#1F2937',
                      fontSize: 16,
                      height: 54,
                    },
                  }}
                  placeholder="Enter phone number"
                  onChangePhoneNumber={setPhoneNumber}
                  selectedCountry={selectedCountry}
                  onChangeSelectedCountry={setSelectedCountry}
                  accessibilityLabel="Phone number input"
                />
              </View>

              <View style={[styles.inputContainer, focusedInput === 'email' && styles.inputContainerFocused]}>
                <Mail color="#6B7280" size={20} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => handleFocus('email')}
                  onBlur={handleBlur}
                  accessibilityLabel="Email input"
                />
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}
              {success && <Text style={styles.successText}>{success}</Text>}

              {loading ? (
                <ActivityIndicator size="large" color="#1E3A8A" style={styles.loader} />
              ) : (
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleForgotPassword}
                  disabled={loading}
                  accessibilityLabel="Send reset code button"
                >
                  <Text style={styles.buttonText}>Send Reset Code</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.backToLoginText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 60,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  logoSize: {
    width: 120,
    height: 120,
  },
  formContainer: {
    flex: 1,
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  headerText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  brand: {
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 56,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerPhone: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  inputContainerFocused: {
    borderColor: '#1E3A8A',
    shadowOpacity: 0.2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 10,
    paddingVertical: 0,
    height: 54,
  },
  submitButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14,
  },
  successText: {
    color: '#34C759',
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14,
  },
  backToLoginText: {
    color: '#1E3A8A',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    fontWeight: '500',
  },
  loader: {
    marginVertical: 20,
  },
});

export default ForgotPasswordScreen;