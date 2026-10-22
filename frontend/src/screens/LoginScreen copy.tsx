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
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { Eye, EyeOff } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import api from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import PhoneInput, { ICountry, isValidPhoneNumber } from 'react-native-international-phone-number';
import { RootStackParamList } from '../navigation/AppNavigator';
import { NativeModules } from 'react-native';
const { ShakeModule } = NativeModules;


interface LoginScreenProps {
  setIsLoggedIn: (isLoggedIn: boolean) => void;
}

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface LoginResponse {
  token: string;
  user: {
    fcmToken?: string;
    name: string;
    email: string;
    phoneNumber: string;
    emergencyContacts?: any[];
  };
}

interface VerifyOTPResponse {
  token: string;
  user: {
    fcmToken?: string;
    name: string;
    email: string;
    phoneNumber: string;
    status: string;
    emergencyContacts?: any[];
  };
}

const LoginScreen: React.FC<LoginScreenProps> = ({ setIsLoggedIn }) => {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { setUser, setEmergencyContacts } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const trackInstall = async () => {
      try {
        // Check if already tracked
        const hasTracked = await AsyncStorage.getItem('install_tracked');
        if (hasTracked) return;

        // Generate a unique install ID
        const installId = uuidv4();

        // Send to backend
        await api.post('/web/install', {
          installId,
          platform: Platform.OS, // 'ios' or 'android'
        });
        console.log("Runned installs")
        // Mark as tracked
        await AsyncStorage.setItem('install_tracked', 'true');
      } catch (error) {
        console.log('Install tracking failed (non-critical):', error);
      }
    };

    trackInstall();
  }, []);

  const refs = Array(6)
    .fill(0)
    .map(() => useRef<TextInput>(null));

  useEffect(() => {
    if (showOtpModal) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showOtpModal]);

  const handleFocus = (field: string) => setFocusedInput(field);
  const handleBlur = () => setFocusedInput(null);

  // ✅ Validate phone number
  const validatePhoneNumber = (): boolean => {
    const trimmedPhone = phoneNumber.trim();

    if (!trimmedPhone) {
      setError('Please enter a phone number');
      return false;
    }

    if (!selectedCountry) {
      setError('Please select a country');
      return false;
    }

    // Use isValidPhoneNumber from the library
    const isValid = isValidPhoneNumber(trimmedPhone, selectedCountry);

    if (!isValid) {
      setError('Please enter a valid phone number for the selected country');
      return false;
    }

    return true;
  };

  // ✅ Validate password
  const validatePassword = (): boolean => {
    if (!password) {
      setError('Please enter your password');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    // ✅ Validate inputs
    if (!validatePhoneNumber() || !validatePassword()) {
      setLoading(false);
      setTimeout(() => setError(null), 4000);
      return;
    }

    // === Format phone number ===
    let formattedPhoneNumber = phoneNumber.trim();

    if (!formattedPhoneNumber.startsWith('+') && selectedCountry?.idd?.root) {
      formattedPhoneNumber = selectedCountry.idd.root + phoneNumber.replace(/\s+/g, '');
    } else {
      formattedPhoneNumber = formattedPhoneNumber.replace(/\s+/g, '');
    }

    try {
      console.log('Login →', { phoneNumber: formattedPhoneNumber });

      const response = await api.post<LoginResponse>('/auth/login', {
        phoneNumber: formattedPhoneNumber,
        password,
      });

      console.log('Login SUCCESS →', response.data);

      const { token, user } = response.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('isLoggedIn', 'true');
      // Save token for Kotlin native SOS
      ShakeModule.saveToken(token);

      if (user.fcmToken) {
        await AsyncStorage.setItem('fcmToken', user.fcmToken);
      }

      setUser(user);
      if (user.emergencyContacts) {
        setEmergencyContacts(user.emergencyContacts);
      }
      setIsLoggedIn(true);

      setSuccessMessage('Welcome back!');

    } catch (error: any) {
      console.log('Login FAILED →', error);

      let displayError = 'Failed to login. Try again later.';

      // === Only show backend error if exists ===
      if (error.response?.data) {
        const data = error.response.data;

        if (data.error) {
          displayError = data.error;
        } else if (data.message) {
          displayError = typeof data.message === 'string' ? data.message : data.message[0] || displayError;
        } else if (Array.isArray(data.formatted)) {
          displayError = data.formatted.map((e: any) => e.message).join(', ');
        }
      }

      // === Special: OTP Required Case ===
      if (displayError.toLowerCase().includes('otp') ||
        displayError.toLowerCase().includes('verify') ||
        displayError.includes('Please verify your account')) {

        const email = error.response?.data?.user?.email ||
          error.response?.data?.email ||
          '';

        setSuccessMessage('Please verify your account with the OTP sent to your email.');
        setUserEmail(email);
        setShowOtpModal(true);
        await AsyncStorage.setItem('tempUserEmail', email);
        setLoading(false);
        return; // Don't show error toast
      }

      // === Network / Other errors ===
      if (!error.response && error.request) {
        displayError = 'No internet connection.';
      }

      setError(displayError);

    } finally {
      setLoading(false);

      // Auto-clear messages after 4 seconds
      setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 4000);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setOtpError(null);
    try {
      const email = await AsyncStorage.getItem('tempUserEmail');
      if (!email) {
        setOtpError('No email found. Please try logging in again.');
        return;
      }
      await api.post('/auth/resend-otp', { email });
      setSuccessMessage('OTP resent successfully');
    } catch (error: any) {
      setOtpError(error.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setLoading(false);
      setTimeout(() => setOtpError(null), 2000);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1 || (text && !/^[0-9]$/.test(text))) return;
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) {
      refs[index + 1].current?.focus();
    } else if (!text && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  const handleOtpSubmit = async () => {
    setLoading(true);
    setOtpError(null);
    try {
      const otpCode = otp.join('');
      if (otpCode.length !== 6) {
        setOtpError('Please enter a 6-digit OTP');
        return;
      }
      const email = await AsyncStorage.getItem('tempUserEmail');
      if (!email) {
        setOtpError('User data not found. Please try logging in again.');
        return;
      }
      const response = await api.post<VerifyOTPResponse>('/auth/verify-otp', {
        email,
        otp: otpCode,
      });
      if (response.status === 200) {
        const { token, user } = response.data;
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        await AsyncStorage.setItem('isLoggedIn', JSON.stringify(true));
        ShakeModule.saveToken(token);
        if (user.fcmToken) {
          await AsyncStorage.setItem('fcmToken', user.fcmToken);
        }
        setUser(user);
        if (user.emergencyContacts) {
          setEmergencyContacts(user.emergencyContacts);
        }
        setIsLoggedIn(true);
        setShowOtpModal(false);
        setOtp(Array(6).fill(''));
      }
    } catch (error: any) {
      setOtpError(error.response?.data?.error || 'OTP verification failed');
      console.error('OTP verification error:', error.message);
    } finally {
      setLoading(false);
      setTimeout(() => setOtpError(null), 2000);
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
              <Text style={styles.loginText}>Welcome Back!</Text>
              <Text style={styles.welcomeText}>
                Log in to <Text style={styles.brand}>Jymberee</Text>
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
                    borderTopLeftRadius: 12,
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
                onFocus={() => handleFocus('phone')}
                onBlur={handleBlur}
                accessibilityLabel="Phone number input"
              />
            </View>

            <View style={[styles.inputContainer, focusedInput === 'password' && styles.inputContainerFocused]}>
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff color="#6B7280" size={20} /> : <Eye color="#6B7280" size={20} />}
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => handleFocus('password')}
                onBlur={handleBlur}
                accessibilityLabel="Password input"
              />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
            {successMessage && <Text style={styles.successText}>{successMessage}</Text>}

            {loading ? (
              <ActivityIndicator size="large" color="#1E3A8A" style={styles.loader} />
            ) : (
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
                accessibilityLabel="Login button"
              >
                <Text style={styles.buttonText}>Login</Text>
              </TouchableOpacity>
            )}

            <View style={styles.linksContainer}>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerText}>
                  Don't have an account? <Text style={styles.registerLink}>Register Here</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showOtpModal}
        animationType="none"
        transparent={true}
        onRequestClose={() => {
          setShowOtpModal(false);
          setOtp(Array(6).fill(''));
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Animated.View
            style={[styles.modalContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Verify OTP</Text>
              <Text style={styles.modalSubtitle}>
                Enter the 6-digit code sent to {userEmail || 'your email'}
              </Text>

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={refs[index]}
                    style={[styles.otpInput, digit && styles.otpInputFilled]}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    autoFocus={index === 0}
                    selectionColor="#1E3A8A"
                    autoComplete="one-time-code"
                    returnKeyType={index < 5 ? 'next' : 'done'}
                    onSubmitEditing={() => {
                      if (index < 5) {
                        refs[index + 1].current?.focus();
                      } else {
                        handleOtpSubmit();
                      }
                    }}
                    accessibilityLabel={`OTP digit ${index + 1}`}
                  />
                ))}
              </View>

              {otpError && <Text style={styles.errorText}>{otpError}</Text>}

              <TouchableOpacity
                style={[styles.submitOtpButton, loading && styles.submitOtpButtonDisabled]}
                onPress={handleOtpSubmit}
                disabled={loading}
                accessibilityLabel="Verify OTP button"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Verify OTP</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendOtp}
                disabled={loading}
                accessibilityLabel="Resend OTP"
              >
                <Text style={styles.resendText}>Resend OTP</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowOtpModal(false);
                  setOtp(Array(6).fill(''));
                }}
                accessibilityLabel="Cancel OTP verification"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
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
  decorativeElement: {
    position: 'absolute',
    right: -150,
    top: -170,
    zIndex: -1,
  },
  rightSize: {
    width: 300,
    height: 300,
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
  loginText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  welcomeText: {
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
  loginButton: {
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
  linksContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  registerText: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 12,
  },
  registerLink: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
  forgotPasswordText: {
    color: '#1E3A8A',
    fontSize: 14,
    fontWeight: '500',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 24,
  },
  socialButton: {
    padding: 12,
    borderRadius: 50,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  loader: {
    marginVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalContent: {
    width: '100%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 48,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    color: '#1E3A8A',
    backgroundColor: '#F9FAFB',
    fontWeight: '600',
    lineHeight: 25,
    paddingVertical: 0,
    marginHorizontal: 1,
  },
  otpInputFilled: {
    borderColor: '#1E3A8A',
    backgroundColor: '#F0F0F0',
  },
  submitOtpButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  submitOtpButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  resendButton: {
    padding: 12,
    marginBottom: 12,
  },
  resendText: {
    color: '#1E3A8A',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LoginScreen;