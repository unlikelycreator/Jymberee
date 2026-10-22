import React, { useState } from 'react';
import { View, StyleSheet, Text, Modal, Pressable } from 'react-native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft } from 'lucide-react-native';
import { useAuth, AuthContextType } from '../context/AuthContext';
import { createNavigationContainerRef } from '@react-navigation/native';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import EmergencyScreen from '../screens/OtherEmergencyScreen';
import EmergencyContacts from '../screens/EmergencyContacts';
import ProfileResetPassword from '../screens/ResetPassword';
import RapeScreen from '../screens/RapeScreen';
import CrimeScreen from '../screens/TheftScreen';
import Medical from '../screens/Medical';
import FireScreen from '../screens/FireScreen';
import FirstAidGuide from '../screens/FirstAidGuide';
import SafetyTips from '../screens/SafetyTipsScreen';
import FireSafetyTips from '../screens/FireSafetyTipsScreen';
import OtherScreen from '../screens/MoreScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MedicalSafetyTips from '../screens/MedicalSafetyTipsScreen';
import CrimePreventionTips from '../screens/CrimePreventionTips';
import Map from '../screens/MapScreen';
import TabNavigator from './TabNavigator';
import { useNavigation } from '@react-navigation/native';
import ReferralScreen from '../screens/ReferralScreen';
import DeleteAccountScreen from '../screens/DeleteAccountScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import PersonalInfoScreen from '../screens/PersonalInfoScreen';
import LocationScreen from '../screens/LocationScreen';
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Home: undefined; 
  Profile: undefined;
  EmergencyContacts: undefined;
  ResetPassword: undefined;
  ProfileResetPassword: undefined;
  rapescreen: undefined;
  CrimeScreen: undefined;
  Medical: undefined;
  FireScreen: undefined;
  EmergencyScreen: undefined;
  Other: undefined;
  'crime-prevention-tips': undefined;
  'medical-safety-tips': undefined;
  'first-aid-guide': undefined;
  'safety-tips': undefined;
  'fire-safety-tips': undefined;
  DeleteAccount:undefined;
  Privacy:undefined;
  PersonalInfo: undefined;
  Location:undefined;
  Map: { sosData?: { sos?: string } } | undefined;
  ReferralScreen: undefined;
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const Stack = createStackNavigator<RootStackParamList>();

const Popup = ({ isVisible, title, message, onClose }: { isVisible: boolean; title: string; message: string; onClose: () => void }) => {
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.popupContainer}>
          <Text style={styles.popupTitle}>{title}</Text>
          <Text style={styles.popupMessage}>{message}</Text>
          <Pressable style={styles.popupButton} onPress={onClose}>
            <Text style={styles.popupButtonText}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const MoreStackNavigator: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  return (
    <Stack.Navigator>
      {['first-aid-guide', 'safety-tips', 'fire-safety-tips', 'crime-prevention-tips', 'medical-safety-tips', 'Other'].map((name) => (
        <Stack.Screen
          key={name}
          name={name as keyof RootStackParamList}
          component={
            {
              'first-aid-guide': FirstAidGuide,
              'safety-tips': SafetyTips,
              'fire-safety-tips': FireSafetyTips,
              'medical-safety-tips': MedicalSafetyTips,
              'crime-prevention-tips': CrimePreventionTips,
              Other: OtherScreen,
            }[name] as React.ComponentType<any>
          }
          options={{
            title: name
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase()),
            headerLeft: () => (
              <Pressable
                style={styles.headerButton}
                onPress={() => navigation.goBack()}
              >
                <ArrowLeft size={24} color="#007AFF" />
              </Pressable>
            ),
            headerStyle: { backgroundColor: '#eda195' },
          }}
        />
      ))}
    </Stack.Navigator>
  );
};

const AuthenticatedNavigator: React.FC = () => {
  const { setUser, setEmergencyContacts, setIsLoggedIn } = useAuth() as AuthContextType;
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupData, setPopupData] = useState({ title: '', message: '' });

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('isLoggedIn');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      setIsLoggedIn(false);
      setUser(null);
      setEmergencyContacts([]);
      setPopupData({
        title: 'Success',
        message: 'Logged out successfully',
      });
      setPopupVisible(true);
    } catch (error) {
      console.error('Error logging out:', error);
      setPopupData({
        title: 'Error',
        message: 'Failed to log out',
      });
      setPopupVisible(true);
    }
  };

  return (
    <>
      <Stack.Navigator>
        <Stack.Screen
          name="Home" 
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Profile"
          children={(props) => (
            <ProfileScreen {...props} handleLogout={handleLogout} />
          )}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EmergencyContacts"
          component={EmergencyContacts}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ProfileResetPassword}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProfileResetPassword"
          component={ProfileResetPassword}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="rapescreen"
          component={RapeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CrimeScreen"
          component={CrimeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Medical"
          component={Medical}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FireScreen"
          component={FireScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EmergencyScreen"
          component={EmergencyScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="first-aid-guide"
          component={FirstAidGuide}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="safety-tips"
          component={SafetyTips}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="fire-safety-tips"
          component={FireSafetyTips}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Other"
          component={OtherScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="medical-safety-tips"
          component={MedicalSafetyTips}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="crime-prevention-tips"
          component={CrimePreventionTips}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ReferralScreen"
          component={ReferralScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
        name="Privacy" 
        component={PrivacyScreen}
        options={{ headerShown: false }} />
        <Stack.Screen 
        name="DeleteAccount" 
        component={DeleteAccountScreen}
        options={{ headerShown: false }}
        />
       <Stack.Screen
  name="PersonalInfo"
  children={(props) => (
    <PersonalInfoScreen {...props} handleLogout={handleLogout} />
  )}
  options={{ headerShown: false }}
        />
       <Stack.Screen 
       name="Location" 
       component={LocationScreen}
       options={{ headerShown: false }}
       />
        <Stack.Screen
          name="Map"
          component={Map}
          options={{
            headerShown: true,
            title: 'Map',
            headerStyle: { backgroundColor: '#eda195' },
            headerLeft: () => (
              <Pressable
                style={styles.headerButton}
                onPress={() => navigationRef.current?.goBack()}
              >
                <ArrowLeft size={24} color="#007AFF" />
              </Pressable>
            ),
          }}
        />
      </Stack.Navigator>
      <Popup
        isVisible={popupVisible}
        title={popupData.title}
        message={popupData.message}
        onClose={() => setPopupVisible(false)}
      />
    </>
  );
};

const UnauthenticatedNavigator: React.FC = () => {
  const { setIsLoggedIn } = useAuth() as AuthContextType;
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupData, setPopupData] = useState({ title: '', message: '' });

  return (
    <>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          options={{ headerShown: false }}
          children={(props) => (
            <LoginScreen
              {...props}
              setIsLoggedIn={(value) => {
                setIsLoggedIn(value);
                setPopupData({
                  title: 'Success',
                  message: 'Logged in successfully',
                });
                setPopupVisible(true);
              }}
            />
          )}
        />
        <Stack.Screen
          name="Register"
          options={{ headerShown: false }}
          children={(props) => (
            <RegisterScreen
              {...props}
              setIsLoggedIn={(value) => {
                setIsLoggedIn(value);
                setPopupData({
                  title: 'Success',
                  message: 'Registered successfully',
                });
                setPopupVisible(true);
              }}
            />
          )}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
      <Popup
        isVisible={popupVisible}
        title={popupData.title}
        message={popupData.message}
        onClose={() => setPopupVisible(false)}
      />
    </>
  );
};

const AppNavigator: React.FC = () => {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <AuthenticatedNavigator /> : <UnauthenticatedNavigator />;
};

const styles = StyleSheet.create({
  headerButton: {
    padding: 10,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  popupContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  popupMessage: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  popupButton: {
    backgroundColor: '#d9534f',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  popupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AppNavigator;