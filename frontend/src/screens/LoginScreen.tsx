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
  Animated, NativeModules
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { Eye, EyeOff } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import api from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import PhoneInput, { ICountry } from 'react-native-international-phone-number';
import { RootStackParamList } from '../navigation/AppNavigator';

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

  const refs = Array(6).fill(0).map(() => useRef<TextInput>(null));

  // Track install only once
  useEffect(() => {
    const trackInstall = async () => {
      try {
        const hasTracked = await AsyncStorage.getItem('install_tracked');
        if (hasTracked) return;

        const installId = uuidv4();
        await api.post('/web/install', {
          installId,
          platform: Platform.OS,
        });
        await AsyncStorage.setItem('install_tracked', 'true');
      } catch (error) {
        console.log('Install tracking failed (non-critical):', error);
      }
    };

    trackInstall();
  }, []);

  // Modal animation
  useEffect(() => {
    if (showOtpModal) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [showOtpModal]);

  const handleFocus = (field: string) => setFocusedInput(field);
  const handleBlur = () => setFocusedInput(null);

  // Helper to finalize login (common for both normal & OTP login)
  const finalizeLogin = async (token: string, user: any) => {
    try {
      await Promise.all([
        AsyncStorage.setItem('token', token),
        AsyncStorage.setItem('user', JSON.stringify(user)),
        AsyncStorage.setItem('isLoggedIn', 'true'),
        user.fcmToken ? AsyncStorage.setItem('fcmToken', user.fcmToken) : Promise.resolve(),
      ]);

      setUser(user);
      if (user.emergencyContacts) {
        setEmergencyContacts(user.emergencyContacts);
      }

      // Call native module ONLY AFTER everything critical is done
      if (Platform.OS === 'android' && ShakeModule?.saveToken) {
        try {
          ShakeModule.saveToken(token);
        } catch (nativeError) {
          console.warn('ShakeModule.saveToken failed (non-critical):', nativeError);
          // Don't block login if native fails
        }
      }

      setIsLoggedIn(true);
    } catch (err) {
      console.error('Finalize login failed:', err);
      setError('Login succeeded but failed to save data. Please try again.');
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    let formattedPhoneNumber = phoneNumber.trim();
    if (!formattedPhoneNumber.startsWith('+') && selectedCountry?.idd?.root) {
      formattedPhoneNumber = selectedCountry.idd.root + phoneNumber.replace(/\s+/g, '');
    } else {
      formattedPhoneNumber = formattedPhoneNumber.replace(/\s+/g, '');
    }

    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        phoneNumber: formattedPhoneNumber,
        password,
      });
      const { token, user } = response.data;


      await finalizeLogin(token, user);
      setSuccessMessage('Welcome back!');

    } catch (error: any) {
      let displayError = 'Failed to login. Try again later.';

      if (error.response?.data) {
        const data = error.response.data;
        if (data.error) displayError = data.error;
        else if (data.message)
          displayError = typeof data.message === 'string' ? data.message : data.message[0] || displayError;
        else if (Array.isArray(data.formatted))
          displayError = data.formatted.map((e: any) => e.message).join(', ');
      }

      // OTP Required Case
      if (
        displayError.toLowerCase().includes('otp') ||
        displayError.toLowerCase().includes('verify') ||
        displayError.includes('Please verify your account')
      ) {
        const email = error.response?.data?.user?.email || error.response?.data?.email || '';
        setUserEmail(email);
        setSuccessMessage('Please verify your account with the OTP sent to your email.');
        setShowOtpModal(true);
        await AsyncStorage.setItem('tempUserEmail', email);
        setLoading(false);
        return;
      }

      if (!error.response && error.request) {
        displayError = 'No internet connection.';
      }

      setError(displayError);
    } finally {
      setLoading(false);
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
      if (!email) throw new Error('No email found');
      await api.post('/auth/resend-otp', { email });
      setSuccessMessage('OTP resent successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setOtpError(error.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setLoading(false);
      setTimeout(() => setOtpError(null), 3000);
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

      let formattedPhoneNumber = phoneNumber.trim();
      if (!formattedPhoneNumber.startsWith('+') && selectedCountry?.idd?.root) {
        formattedPhoneNumber = selectedCountry.idd.root + phoneNumber.replace(/\s+/g, '');
      } else {
        formattedPhoneNumber = formattedPhoneNumber.replace(/\s+/g, '');
      }
      const response = await api.post<VerifyOTPResponse>('/auth/verify-otp', {
        email: '',
        phoneNumber: formattedPhoneNumber,
        otp: otpCode,
      });

      const { token, user } = response.data;

      // Finalize login same as normal flow
      await finalizeLogin(token, user);

      setShowOtpModal(false);
      setOtp(Array(6).fill(''));
      setSuccessMessage('Login successful!');

    } catch (error: any) {
      setOtpError(error.response?.data?.error || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
      setTimeout(() => setOtpError(null), 3000);
    }
  };

  // Rest of your JSX remains exactly the same
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
                  container: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, height: 56 },
                  flagContainer: { borderTopLeftRadius: 12, borderBottomLeftRadius: 12, backgroundColor: '#F9FAFB', justifyContent: 'center', height: 54 },
                  caret: { color: '#1F2937', fontSize: 16 },
                  divider: { backgroundColor: '#E5E7EB', width: 1, marginHorizontal: 8 },
                  callingCode: { fontSize: 16, color: '#1F2937', fontWeight: '500' },
                  input: { color: '#1F2937', fontSize: 16, height: 54 },
                }}
                placeholder="Enter phone number"
                onChangePhoneNumber={setPhoneNumber}
                selectedCountry={selectedCountry}
                onChangeSelectedCountry={setSelectedCountry}
                accessibilityLabel="Phone number input"
              />
            </View>

            <View style={[styles.inputContainer, focusedInput === 'password' && styles.inputContainerFocused]}>
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
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
              <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
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
        <Text style={styles.footerText}>© 2026 Ezeelink IT Solutions LLP {"\n"}Designed & Developed by Ezeelink</Text>

      </KeyboardAvoidingView>

      {/* OTP Modal - unchanged */}
      <Modal visible={showOtpModal} animationType="none" transparent={true} onRequestClose={() => setShowOtpModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
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
                      if (index < 5) refs[index + 1].current?.focus();
                      else handleOtpSubmit();
                    }}
                  />
                ))}
              </View>

              {otpError && <Text style={styles.errorText}>{otpError}</Text>}

              <TouchableOpacity
                style={[styles.submitOtpButton, loading && styles.submitOtpButtonDisabled]}
                onPress={handleOtpSubmit}
                disabled={loading}
              >
                {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendButton} onPress={handleResendOtp} disabled={loading}>
                <Text style={styles.resendText}>Resend OTP</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setShowOtpModal(false); setOtp(Array(6).fill('')); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

// Styles remain exactly the same as your original
const styles = StyleSheet.create({
  // ... (all your styles unchanged)
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  contentContainer: { flex: 1 },
  scrollContainer: { paddingBottom: 60, paddingHorizontal: 24 },
  logoContainer: { alignItems: 'center', paddingVertical: 40 },
  logoSize: { width: 120, height: 120 },
  formContainer: { flex: 1 },
  header: { alignItems: 'flex-start', marginBottom: 30 },
  loginText: { fontSize: 32, fontWeight: '700', color: '#1E3A8A', marginBottom: 8 },
  welcomeText: { fontSize: 16, color: '#6B7280', lineHeight: 24 },
  brand: { fontWeight: 'bold', color: '#1E3A8A' },
  inputContainerPhone: { marginBottom: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingHorizontal: 12, height: 56, borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  inputContainerFocused: { borderColor: '#1E3A8A', shadowOpacity: 0.2 },
  input: { flex: 1, fontSize: 16, color: '#1F2937', marginLeft: 10, paddingVertical: 0, height: 54 },
  loginButton: {
    backgroundColor: '#1E3A8A', borderRadius: 12, padding: 16, alignItems: 'center',
    marginTop: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#DC2626', textAlign: 'center', marginBottom: 12, fontSize: 14 },
  successText: { color: '#34C759', textAlign: 'center', marginBottom: 12, fontSize: 14 },
  linksContainer: { alignItems: 'center', marginVertical: 20 },
  registerText: { color: '#6B7280', fontSize: 14, marginBottom: 12 },
  registerLink: { color: '#1E3A8A', fontWeight: '600' },
  forgotPasswordText: { color: '#1E3A8A', fontSize: 14, fontWeight: '500' },
  footerText  : { color: '#798085', fontSize: 10, fontWeight: '500' ,display: 'flex', textAlign: 'center', marginBottom: 10},
  loader: { marginVertical: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: {
    width: '90%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,
  },
  modalContent: { width: '100%', alignItems: 'center' },
  modalTitle: { fontSize: 24, fontWeight: '700', color: '#1E3A8A', marginBottom: 12 },
  modalSubtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 24 },
  otpInput: {
    width: 48, height: 48, borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 12,
    textAlign: 'center', fontSize: 20, color: '#1E3A8A', backgroundColor: '#F9FAFB',
    fontWeight: '600', paddingVertical: 0, marginHorizontal: 1,
  },
  otpInputFilled: { borderColor: '#1E3A8A', backgroundColor: '#F0F0F0' },
  submitOtpButton: { backgroundColor: '#1E3A8A', borderRadius: 12, padding: 16, alignItems: 'center', width: '100%', marginBottom: 12 },
  submitOtpButtonDisabled: { backgroundColor: '#9CA3AF' },
  resendButton: { padding: 12, marginBottom: 12 },
  resendText: { color: '#1E3A8A', fontSize: 16, fontWeight: '500' },
  cancelText: { color: '#DC2626', fontSize: 16, fontWeight: '500' },
});

export default LoginScreen;