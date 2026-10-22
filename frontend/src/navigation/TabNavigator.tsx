import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Modal,
  Pressable,
  Dimensions,
  Animated,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Map as MapIcon, Siren, AlertCircle, Heart, Flame, Shield, XCircle } from 'lucide-react-native';
import DashboardScreen from '../screens/DashboardScreen';
import Map from '../screens/MapScreen';
import { takePhotoAndUpload } from '../utils/sendsos';
import GetLocation from 'react-native-get-location';
import { useAuth } from '../context/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Dashboard: undefined;
  SOS: undefined;
  Map: undefined;
  Profile: undefined;
  EmergencyContacts: undefined;
};

type TabParamList = {
  Dashboard: undefined;
  SOS: undefined;
  Map: undefined;
};

type TabNavigatorNavigationProp = StackNavigationProp<RootStackParamList>;

interface TabNavigatorProps {
  navigation: TabNavigatorNavigationProp;
}

const Tab = createBottomTabNavigator<TabParamList>();

const SOSScreen = () => <View />;

const TabNavigator: React.FC<TabNavigatorProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { emergencyContacts } = useAuth();
  const [popupVisible, setPopupVisible] = useState(false);
  const [descriptionModalVisible, setDescriptionModalVisible] = useState(false);
  const [otherDescription, setOtherDescription] = useState('');
  const [currentOption, setCurrentOption] = useState<typeof sosOptions[0] | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({
    Fire: false,
    Theft: false,
    Rape: false,
    Medical: false,
    Other: false,
  });
  const sosOptions = [
    {
      label: 'Fire',
      icon: Flame,
      color: '#FF5733',
      description: 'A fire emergency has been reported',
    },
    {
      label: 'Theft',
      icon: Shield,
      color: '#FF9500',
      description: 'A theft incident has been reported',
    },
    {
      label: 'Rape',
      icon: AlertCircle,
      color: '#FF3B30',
      description: 'Rape Case Emergency',
    },
    {
      label: 'Medical',
      icon: Heart,
      color: '#FF2D55',
      description: 'A medical emergency has been reported',
    },
    {
      label: 'Other',
      icon: Siren,
      color: '#007AFF',
      description: '',
    },
  ];

  const bubbleAnims = useRef(sosOptions.map(() => new Animated.Value(0))).current;
  const closeButtonAnim = useRef(new Animated.Value(0)).current;

  const showPopup = (title: string, message: string, autoCloseDuration: number | null = null) => {
    Alert.alert(title, message, [
      { text: 'OK', style: 'cancel' },
      ...(autoCloseDuration ? [] : [{ text: 'Retry', onPress: () => {} }]),
    ]);
    if (autoCloseDuration) {
      setTimeout(() => Alert.alert(''), autoCloseDuration);
    }
  };

  const checkEmergencyContacts = () => {
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

  const handleSOSPress = async (option: typeof sosOptions[0]) => {
    if (!checkEmergencyContacts()) {
      setPopupVisible(false);
      return;
    }

    if (option.label === 'Other') {
      setCurrentOption(option);
      setOtherDescription('');
      setPopupVisible(false);
      setDescriptionModalVisible(true);
      return;
    }

    setLoadingStates((prev) => ({ ...prev, [option.label]: true }));
    try {
      const location = await GetLocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 60000,
      });
      const { latitude, longitude } = location;

      await takePhotoAndUpload({
        description: option.description,
        showPopup,
      });

      setPopupVisible(false);
      Alert.alert('Success', `${option.label} emergency reported successfully.`);
    } catch (error: any) {
      console.error(`Failed to report ${option.label} emergency:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      Alert.alert(
        'Error',
        error.response?.status === 404
          ? `${option.label} service is currently unavailable. Please try again later or contact support.`
          : error.message || `Failed to report ${option.label} emergency. Please try again.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleSOSPress(option) },
        ]
      );
    } finally {
      setLoadingStates((prev) => ({ ...prev, [option.label]: false }));
    }
  };

  const handleOtherDescriptionSubmit = async () => {
    if (!currentOption || !otherDescription.trim()) {
      Alert.alert('Error', 'Please provide a description for the emergency.');
      return;
    }

    if (!checkEmergencyContacts()) {
      setDescriptionModalVisible(false);
      setPopupVisible(false);
      return;
    }

    setLoadingStates((prev) => ({ ...prev, [currentOption.label]: true }));
    setDescriptionModalVisible(false);
    setPopupVisible(false);

    try {
      const location = await GetLocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 60000,
      });
      const { latitude, longitude } = location;

      await takePhotoAndUpload({
        description: otherDescription,
        showPopup,
      });

      Alert.alert('Success', `${currentOption.label} emergency reported successfully.`);
    } catch (error: any) {
      console.error(`Failed to report ${currentOption.label} emergency:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      Alert.alert(
        'Error',
        error.response?.status === 404
          ? `${currentOption.label} service is currently unavailable. Please try again later or contact support.`
          : error.message || `Failed to report ${currentOption.label} emergency. Please try again.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleOtherDescriptionSubmit() },
        ]
      );
    } finally {
      setLoadingStates((prev) => ({ ...prev, [currentOption.label]: false }));
    }
  };

  const { width, height } = Dimensions.get('window');
  const sosButtonCenterX = width / 2;
  const sosButtonCenterY = height - (insets.bottom + 60);
  const radius = width * 0.28;
  const angleStep = Math.PI / (sosOptions.length - 1);

  useEffect(() => {
    if (popupVisible) {
      const animations = bubbleAnims.map((anim, index) =>
        Animated.sequence([
          Animated.delay(index * 100),
          Animated.spring(anim, {
            toValue: 1,
            friction: 5,
            tension: 60,
            useNativeDriver: true,
          }),
        ])
      );
      const closeAnim = Animated.spring(closeButtonAnim, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
        delay: sosOptions.length * 100,
      });
      Animated.parallel([...animations, closeAnim]).start();
    } else {
      bubbleAnims.forEach((anim) => anim.setValue(0));
      closeButtonAnim.setValue(0);
    }
  }, [popupVisible]);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const iconColor = route.name === 'SOS' ? '#fff' : focused ? '#007AFF' : 'gray';
            let IconComponent = Siren;
            let label = '';
            if (route.name === 'Dashboard') {
              IconComponent = Home;
              label = 'Dashboard';
            } else if (route.name === 'Map') {
              IconComponent = MapIcon;
              label = 'Map';
            } else if (route.name === 'SOS') {
              IconComponent = popupVisible ? XCircle : Siren;
              label = popupVisible ? 'Close' : '';
            }
            return (
              <View
                style={[styles.tabIconContainer, route.name === 'SOS' && styles.sosTabIcon]}
              >
                {route.name === 'SOS' ? (
                  <Pressable
                    onPress={() => setPopupVisible(!popupVisible)}
                    disabled={Object.values(loadingStates).some(Boolean)}
                  >
                    <IconComponent size={size} color={iconColor} />
                  </Pressable>
                ) : (
                  <IconComponent size={size} color={iconColor} />
                )}
              </View>
            );
          },
          tabBarLabel: ({ focused }) => {
            const label = route.name === 'SOS' ? (popupVisible ? 'Close' : '') : route.name;
            return (
              <Text style={[styles.tabBarLabel, { color: focused ? '#007AFF' : 'gray' }]}>
                {label}
              </Text>
            );
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: [
            styles.tabBar,
            {
              height: 75,
              paddingTop: 5,
            },
          ],
          tabBarLabelStyle: styles.tabBarLabel,
          headerShown: false,
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen
          name="SOS"
          component={SOSScreen}
          options={{ tabBarLabel: '' }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setPopupVisible(true);
            },
          }}
        />
        <Tab.Screen name="Map" component={Map} />
      </Tab.Navigator>

      {sosOptions.map((option, index) => {
        const angle = Math.PI + index * angleStep;
        const x = sosButtonCenterX + radius * Math.cos(angle) - 32.5;
        const y = sosButtonCenterY + radius * Math.sin(angle) - 88;
        const isLoading = loadingStates[option.label];
        return (
          popupVisible && (
            <Animated.View
              key={option.label}
              style={[
                styles.bubbleButton,
                {
                  position: 'absolute',
                  left: x,
                  top: y,
                  backgroundColor: option.color,
                  transform: [
                    {
                      scale: bubbleAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      }),
                    },
                    {
                      translateY: bubbleAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Pressable
                onPress={() => handleSOSPress(option)}
                style={styles.bubbleButtonContent}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <option.icon size={24} color="#fff" />
                    <Text style={styles.bubbleButtonText}>{option.label}</Text>
                  </>
                )}
              </Pressable>
            </Animated.View>
          )
        );
      })}

      <Modal
        animationType="slide"
        transparent={true}
        visible={descriptionModalVisible}
        onRequestClose={() => setDescriptionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.descriptionModalContent}>
            <Text style={styles.descriptionModalTitle}>Describe the Emergency</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Enter emergency description"
              placeholderTextColor="#999"
              value={otherDescription}
              onChangeText={setOtherDescription}
              multiline
              numberOfLines={4}
            />
            <View style={styles.descriptionModalButtons}>
              <Pressable
                style={[styles.descriptionModalButton, styles.cancelButton]}
                onPress={() => setDescriptionModalVisible(false)}
              >
                <Text style={styles.descriptionModalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.descriptionModalButton, styles.submitButton, { opacity: otherDescription.trim() ? 1 : 0.5 }]}
                onPress={handleOtherDescriptionSubmit}
                disabled={!otherDescription.trim()}
              >
                <Text style={styles.descriptionModalButtonText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#f7f4f4',
    borderTopWidth: 1,
    height: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBarLabel: {
    fontSize: 12,
    paddingBottom: 5,
  },
  tabIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  sosTabIcon: {
    backgroundColor: '#fc4f46',
    borderRadius: 50,
    padding: 20,
    position: 'absolute',
    top: -28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleButton: {
    width: 65,
    height: 65,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  bubbleButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
  },
  bubbleButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  descriptionModalContent: {
    backgroundColor: '#fff',
    width: '80%',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  descriptionModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  descriptionInput: {
    width: '100%',
    height: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    textAlignVertical: 'top',
    color: '#333',
  },
  descriptionModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  descriptionModalButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    color: 'white',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  descriptionModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TabNavigator;