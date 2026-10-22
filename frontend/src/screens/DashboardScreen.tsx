import React, { useContext, useEffect, useState, useRef } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Linking,
  RefreshControl,
  Animated,
  Alert,
  Platform,
  ActivityIndicator,
  PermissionsAndroid,
  Dimensions,
  PanResponder,
  ImageSourcePropType,
  StatusBar,
  DeviceEventEmitter,
  NativeModules,
} from "react-native";

// import {
//   startEarbudSosListener,
//   stopEarbudSosListener,
// } from "../utils/earbudSos";

import {
  MapPin,
  ArrowRightCircle,
  User,
  Bell,
  Gift,
  HelpCircle,
} from "lucide-react-native";

import RNShake from "react-native-shake";
import { useFocusEffect } from "@react-navigation/native";

import {
  startVoiceSosListener,
  stopVoiceSosListener,
  sendSosAppClosed,
} from "../utils/voiceSos";

import { NativeStackScreenProps } from "@react-navigation/native-stack";
import axios, { AxiosResponse } from "axios";
import { AuthContext } from "../context/AuthContext";
import GetLocation from "react-native-get-location";
import Geolocation from "react-native-geolocation-service";
import { RootStackParamList } from "../navigation/AppNavigator";
import Notification from "./Notification";
import api from "../utils/api";

import {
  BannerAd,
  BannerAdSize,
  TestIds,
  useForeground,
} from "react-native-google-mobile-ads";

import AsyncStorage from "@react-native-async-storage/async-storage";
import VoiceCommandsModal from "../components/VoiceCommandsModal";

/* -------------------- VOICE MODAL CONSTANTS -------------------- */
const MODAL_SHOWN_KEY = "@voiceCommandsModalShown";

/* -------------------- UI THEME -------------------- */
const COLORS = {
  bg: "#F6F7FB",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  card2: "#FFFFFF",
  border: "rgba(15,23,42,0.08)",
  text: "#0F172A",
  subText: "rgba(15,23,42,0.65)",
  muted: "rgba(15,23,42,0.50)",
  primary: "#0e84f3",
  primarySoft: "rgba(14,243,136,0.16)",
  accentSoft: "rgba(114,184,86,0.22)",
  danger: "#ef4444",
  white: "#FFFFFF",
};

const UI = {
  r: 18,
  r2: 24,
  pad: 18,
  gap: 12,
};

interface Advertisement {
  id: string;
  imageUrl: string;
  redirectUrl?: string;
}

interface Card {
  image: ImageSourcePropType;
  text: string;
  action: () => void;
}

interface UserType {
  name?: string;
  profilePicture?: string;
}

interface AuthContextType {
  user: UserType | null;
  setUser: React.Dispatch<React.SetStateAction<UserType | null>>;
  emergencyContacts: any[];
  setEmergencyContacts: React.Dispatch<React.SetStateAction<any[]>>;
  isLoggedIn: boolean;
}

type DashboardScreenProps = NativeStackScreenProps<RootStackParamList>;

const adUnitId = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : "ca-app-pub-5133056126463450/3311190081";

const getFullAddressFromCoordinates = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    const response: AxiosResponse = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          "User-Agent": "Jymberee/1.0 divyanshu.tiwari@srconsultants.in",
        },
      }
    );

    const address = response.data.address;
    const addressParts = [
      address.neighbourhood,
      address.suburb,
      address.village,
      address.town,
      address.city,
      address.county,
      address.state_district,
      address.state,
      address.postcode,
      address.country,
    ].filter((part: string | undefined) => part);

    return addressParts.join(", ") || "Unknown Location";
  } catch (error) {
    return "Unknown Location";
  }
};

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const bannerRef = useRef<BannerAd>(null);

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const { user, isLoggedIn } = useContext(AuthContext) as AuthContextType;

  const [location, setLocation] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [currentAdIndex, setCurrentAdIndex] = useState<number>(0);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [hasUnseenNotifications, setHasUnseenNotifications] =
    useState<boolean>(false);

  const [infoModalVisible, setInfoModalVisible] = useState<boolean>(false);

  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [adLoading, setAdLoading] = useState<boolean>(true);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { width } = Dimensions.get("window");

  useForeground(() => {
    Platform.OS === "ios" && bannerRef.current?.load();
  });

  /* ✅ VOICE + SHAKE ONLY WHEN DASHBOARD IS FOCUSED + USER LOGGED IN */
  useFocusEffect(
    React.useCallback(() => {
      if (!isLoggedIn) return;

      let rnShakeSub: any = null;
      let nativeShakeSub: any = null;
      let deepLinkSub: any = null;

      // ✅ Unified SOS trigger with global loader events
      const triggerSOS = async (reason: string) => {
        try {
          DeviceEventEmitter.emit("SOS_SENDING", {
            message: "Sending SOS...",
          });

          const ok = await sendSosAppClosed(reason);

          if (ok) {
            DeviceEventEmitter.emit("SOS_SENT", {
              message: "✅ SOS sent successfully",
            });
          } else {
            DeviceEventEmitter.emit("SOS_FAILED", {
              message: "❌ SOS failed. Please try again.",
            });
          }
        } catch (e) {
          console.log("SOS failed:", e);
          DeviceEventEmitter.emit("SOS_FAILED", {
            message: "❌ SOS failed. Please try again.",
          });
        }
      };

      // 1) Start voice listener
      startVoiceSosListener();

      // ✅ Earbud listener (DO NOT stop immediately)
      // startEarbudSosListener();

      // 2) JS shake listener
      rnShakeSub = RNShake.addListener(() => {
        triggerSOS("Emergency triggered by shake");
      });

      // 3) Native shake service (Android)
      const { ShakeModule } = NativeModules as any;

      if (Platform.OS === "android" && ShakeModule?.startService) {
        ShakeModule.startService();
      }

      // ✅ Use DeviceEventEmitter
      if (Platform.OS === "android") {
        nativeShakeSub = DeviceEventEmitter.addListener("SHAKE_DETECTED", () => {
          triggerSOS("Emergency triggered by native shake");
        });
      }

      // 4) Deep links
      const processSOSFromURL = (url: string) => {
        const match = url
          .toLowerCase()
          .match(/\/sos\/(fire|theft|rape|medical|other)/);

        if (match?.[1]) {
          triggerSOS(`${match[1]} emergency via voice command`);
        }
      };

      const handleUrl = ({ url }: { url: string }) => {
        if (url) processSOSFromURL(url);
      };

      deepLinkSub = Linking.addEventListener("url", handleUrl);

      Linking.getInitialURL().then((url) => {
        if (url) processSOSFromURL(url);
      });

      return () => {
        try {
          stopVoiceSosListener();
        } catch {}

        // try {
        //   stopEarbudSosListener();
        // } catch {}

        try {
          rnShakeSub?.remove?.();
        } catch {}

        try {
          nativeShakeSub?.remove?.();
        } catch {}

        try {
          deepLinkSub?.remove?.();
        } catch {}

        if (Platform.OS === "android" && ShakeModule?.stopService) {
          ShakeModule.stopService();
        }
      };
    }, [isLoggedIn])
  );

  /* -------------------- SHOW VOICE MODAL ONLY ONCE PER INSTALL -------------------- */
  useEffect(() => {
    const run = async () => {
      try {
        const alreadyShown = await AsyncStorage.getItem(MODAL_SHOWN_KEY);
        if (!alreadyShown) {
          setInfoModalVisible(true);
          await AsyncStorage.setItem(MODAL_SHOWN_KEY, "1");
        }
      } catch (e) {}
    };
    run();
  }, []);

  const closeVoiceModal = () => setInfoModalVisible(false);

  const getFallbackAds = (): Advertisement[] => [
    {
      id: "fallback1",
      imageUrl:
        "https://img.freepik.com/free-vector/editable-online-advertising-template-with-megaphone-e-commerce-business_53876-115396.jpg",
      redirectUrl:
        Platform.OS === "android"
          ? "https://play.google.com/store/apps/details?id=com.jymberee&hl=en_IN"
          : "https://apps.apple.com/us/app/jymberee/id6751540033",
    },
    {
      id: "fallback2",
      imageUrl:
        "https://img.freepik.com/free-vector/editable-online-advertising-template-with-megaphone-e-commerce-business_53876-115396.jpg",
      redirectUrl:
        Platform.OS === "android"
          ? "https://play.google.com/store/apps/details?id=com.jymberee&hl=en_IN"
          : "https://apps.apple.com/us/app/jymberee/id6751540033",
    },
    {
      id: "fallback3",
      imageUrl:
        "https://img.freepik.com/free-vector/editable-online-advertising-template-with-megaphone-e-commerce-business_53876-115396.jpg",
      redirectUrl:
        Platform.OS === "android"
          ? "https://play.google.com/store/apps/details?id=com.jymberee&hl=en_IN"
          : "https://apps.apple.com/us/app/jymberee/id6751540033",
    },
  ];

  const fetchAdvertisements = async () => {
    try {
      setAdLoading(true);
      const response = await api.get("/ads");
      const ads = response.data?.advertisements || [];
      setAdvertisements(ads.length > 0 ? ads : getFallbackAds());
    } catch (error: any) {
      console.log("Failed to fetch ads:", error);
      setAdvertisements(getFallbackAds());
    } finally {
      setAdLoading(false);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsPaused(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
      },
      onPanResponderMove: (evt, gestureState) => {
        slideAnim.setValue(gestureState.dx);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const swipeThreshold = width / 3;
        const dx = gestureState.dx;

        if (Math.abs(dx) > swipeThreshold) {
          let nextIndex: number;
          if (dx < 0) {
            nextIndex =
              currentAdIndex === advertisements.length - 1
                ? 0
                : currentAdIndex + 1;
          } else {
            nextIndex =
              currentAdIndex === 0
                ? advertisements.length - 1
                : currentAdIndex - 1;
          }

          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: dx < 0 ? -width : width,
              duration: 380,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setCurrentAdIndex(nextIndex);
            setImageLoading(true);
            setImageError(null);

            slideAnim.setValue(dx < 0 ? width : -width);
            fadeAnim.setValue(0);

            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
              }),
              Animated.timing(slideAnim, {
                toValue: 0,
                duration: 380,
                useNativeDriver: true,
              }),
            ]).start();
          });
        } else {
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }).start();
        }

        setIsPaused(false);
      },
    })
  ).current;

  useEffect(() => {
    if (!isPaused && advertisements.length > 0) {
      intervalRef.current = setInterval(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -width,
            duration: 380,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setCurrentAdIndex((prev) =>
            prev === advertisements.length - 1 ? 0 : prev + 1
          );
          setImageLoading(true);
          setImageError(null);

          slideAnim.setValue(width);
          fadeAnim.setValue(0);

          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 380,
              useNativeDriver: true,
            }),
          ]).start();
        });
      }, 5200);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [
    advertisements.length,
    isPaused,
    currentAdIndex,
    width,
    fadeAnim,
    slideAnim,
  ]);

  useEffect(() => {
    fetchAdvertisements();
  }, []);

  const checkLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted;
    } else if (Platform.OS === "ios") {
      const status = await Geolocation.requestAuthorization("whenInUse");
      return status === "granted";
    }
    return false;
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message:
              "This app needs location access to show your current address.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.log("Location permission error:", error);
        return false;
      }
    } else if (Platform.OS === "ios") {
      try {
        const status = await Geolocation.requestAuthorization("whenInUse");
        return status === "granted";
      } catch (error) {
        console.log("Location permission error:", error);
        return false;
      }
    }
    return false;
  };

  const fetchCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const hasPermission = await checkLocationPermission();
      if (!hasPermission) {
        const permissionGranted = await requestLocationPermission();
        if (!permissionGranted) {
          setLocationError("Location permission denied");
          setLocationLoading(false);
          return;
        }
      }

      const locationData = await GetLocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      const fullAddress = await getFullAddressFromCoordinates(
        locationData.latitude,
        locationData.longitude
      );

      setLocation(fullAddress);
      setLocationError(null);
      setLocationLoading(false);
    } catch (error) {
      console.log("Location error:", error);
      setLocationLoading(false);
      setLocationError("Unable to fetch location");
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchCurrentLocation(), fetchAdvertisements()]).finally(() => {
      setRefreshing(false);
    });
  }, []);

  useEffect(() => {
    fetchCurrentLocation();
  }, [isLoggedIn]);

  const cards: Card[] = [
    {
      image: require("../assets/images/telephone.png"),
      text: "Dial 100",
      action: () => Linking.openURL("tel:100"),
    },
    {
      image: require("../assets/images/protection.png"),
      text: "Rape",
      action: () => navigation.navigate("rapescreen"),
    },
    {
      image: require("../assets/images/theft.png"),
      text: "Theft",
      action: () => navigation.navigate("CrimeScreen"),
    },
    {
      image: require("../assets/images/medical.png"),
      text: "Medical",
      action: () => navigation.navigate("Medical"),
    },
    {
      image: require("../assets/images/fire-station.png"),
      text: "Fire",
      action: () => navigation.navigate("FireScreen"),
    },
    {
      image: require("../assets/images/emergency-contact.png"),
      text: "Others",
      action: () => navigation.navigate("EmergencyScreen"),
    },
  ];

  const subCards: Card[] = [
    {
      image: require("../assets/images/first-aid.png"),
      text: "First Aid",
      action: () => navigation.navigate("first-aid-guide"),
    },
    {
      image: require("../assets/images/safety-tips.png"),
      text: "Safety Tips",
      action: () => navigation.navigate("safety-tips"),
    },
    {
      image: require("../assets/images/fire-safety.png"),
      text: "Fire Safety",
      action: () => navigation.navigate("fire-safety-tips"),
    },
  ];

  const handleNotificationPress = () => setModalVisible(true);
  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  const currentAd = advertisements[currentAdIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Hi, {user?.name || "User"} 👋</Text>
            <Text style={styles.subtitle}>
              Stay safe. Quick help is one tap away.
            </Text>
          </View>

          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.iconChip}
              onPress={() => setInfoModalVisible(true)}
              activeOpacity={0.85}
            >
              <HelpCircle size={20} color={COLORS.danger} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconChip}
              onPress={handleNotificationPress}
              activeOpacity={0.85}
            >
              <View style={{ position: "relative" }}>
                <Bell size={20} color={COLORS.primary} />
                {hasUnseenNotifications && (
                  <View style={styles.notificationBadge} />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileChip}
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.85}
            >
              {user?.profilePicture ? (
                <Image
                  source={{ uri: user.profilePicture }}
                  style={styles.profileImage}
                  onError={(e) =>
                    console.log("Profile error:", e.nativeEvent.error)
                  }
                />
              ) : (
                <User size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* LOCATION */}
        <View style={styles.locationPill}>
          <View style={styles.locationIconWrap}>
            <MapPin size={18} color={COLORS.primary} />
          </View>

          {locationLoading ? (
            <View style={styles.locationRight}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.locationLoadingText}>
                Fetching your location…
              </Text>
            </View>
          ) : (
            <Text
              style={styles.locationText}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {location || locationError || "Set your location"}
            </Text>
          )}
        </View>

        {/* OFFERS */}
        <View style={styles.sectionTopRow}>
          <Text style={styles.sectionTitle}>Offers</Text>
          <TouchableOpacity onPress={fetchAdvertisements} activeOpacity={0.8}>
            <Text style={styles.sectionAction}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.adCard,
            { transform: [{ translateX: slideAnim }], opacity: fadeAnim },
          ]}
        >
          {(adLoading || imageLoading) && (
            <View style={styles.adLoader}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.adLoaderText}>Loading offer…</Text>
            </View>
          )}

          {currentAd && (
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => {
                if (currentAd.redirectUrl) {
                  Linking.openURL(currentAd.redirectUrl).catch(() =>
                    Alert.alert("Error", "Cannot open link")
                  );
                }
              }}
            >
              <Image
                source={{
                  uri: imageError
                    ? "https://via.placeholder.com/300x140.png?text=Ad+Unavailable"
                    : currentAd.imageUrl,
                }}
                style={styles.adImage}
                resizeMode="cover"
                onLoad={() => setImageLoading(false)}
                onError={(e) => {
                  setImageError(e.nativeEvent.error as string);
                  setImageLoading(false);
                }}
              />
            </TouchableOpacity>
          )}
        </Animated.View>

        <View style={styles.pagination}>
          {advertisements.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === currentAdIndex && styles.dotActive]}
            />
          ))}
        </View>

        {/* REFERRAL */}
        <Animated.View
          style={[styles.referralCard, { transform: [{ scale: scaleAnim }] }]}
        >
          <TouchableOpacity
            style={styles.referralButton}
            onPress={() => navigation.navigate("ReferralScreen")}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
          >
            <View style={styles.referralIconContainer}>
              <Gift size={24} color={COLORS.bg} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.referralTitle}>Refer & Earn</Text>
              <Text style={styles.referralSubtitle}>
                Invite friends and unlock rewards.
              </Text>
            </View>

            <ArrowRightCircle size={22} color={COLORS.bg} />
          </TouchableOpacity>
        </Animated.View>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.cardsGrid}>
          {cards.map((card, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={card.action}
              activeOpacity={0.85}
            >
              <View style={styles.cardIcon}>
                <Image
                  source={card.image}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.cardText}>{card.text}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* MORE OPTIONS */}
        <Text style={[styles.sectionTitle, { marginTop: 4 }]}>More Options</Text>
        <View style={styles.subCardsGrid}>
          {subCards.map((card, index) => (
            <TouchableOpacity
              key={index}
              style={styles.subCard}
              onPress={card.action}
              activeOpacity={0.85}
            >
              <View style={styles.subCardIcon}>
                <Image
                  source={card.image}
                  style={styles.subCardImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.subCardText}>{card.text}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.subCard}
            onPress={() => navigation.navigate("Other")}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.subCardIcon,
                { backgroundColor: COLORS.primarySoft },
              ]}
            >
              <ArrowRightCircle size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.subCardText}>More</Text>
          </TouchableOpacity>
        </View>

        {/* BANNER */}
        <View style={styles.bannerContainer}>
          <BannerAd
            ref={bannerRef}
            unitId={adUnitId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            onAdFailedToLoad={(error) => {
              console.error("Banner ad failed to load:", error);
            }}
          />
        </View>

        <View style={{ height: 18 }} />
      </ScrollView>

      <Notification
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onNotificationsChange={setHasUnseenNotifications}
      />

      <VoiceCommandsModal visible={infoModalVisible} onClose={closeVoiceModal} />
    </View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  scrollContainer: {
    paddingTop: 18,
    paddingHorizontal: UI.pad,
    paddingBottom: 18,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.2,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.subText,
  },

  headerIcons: { flexDirection: "row", alignItems: "center", gap: 10 },

  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  profileChip: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  profileImage: { width: 38, height: 38 },

  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.danger,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },

  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: UI.r,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  locationIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  locationRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  locationLoadingText: {
    color: COLORS.muted,
    fontSize: 12.5,
    fontWeight: "700",
  },

  locationText: {
    color: COLORS.subText,
    fontSize: 12.5,
    fontWeight: "700",
    flex: 1,
  },

  sectionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 10,
    letterSpacing: 0.2,
  },

  sectionAction: { fontSize: 12.5, fontWeight: "900", color: "#10B981" },

  adCard: {
    width: width - UI.pad * 2,
    height: 176,
    borderRadius: UI.r2,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },

  adImage: { width: "100%", height: "100%" },

  adLoader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.55)",
  },

  adLoaderText: { color: COLORS.subText, fontSize: 12.5, fontWeight: "800" },

  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    marginBottom: 14,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.18)",
  },

  dotActive: { width: 18, backgroundColor: "#10B981" },

  referralCard: {
    borderRadius: UI.r2,
    overflow: "hidden",
    backgroundColor: COLORS.primary,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },

  referralButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },

  referralIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },

  referralTitle: { fontSize: 15, fontWeight: "900", color: "#dae8e0" },
  referralSubtitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#dae8e0",
    marginTop: 2,
  },

  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  card: {
    width: (width - UI.pad * 2 - 12) / 3,
    backgroundColor: COLORS.surface,
    borderRadius: UI.r,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  cardIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  cardImage: { width: 26, height: 26 },

  cardText: {
    fontSize: 12.5,
    fontWeight: "900",
    color: COLORS.text,
    textAlign: "center",
  },

  subCardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  subCard: {
    width: (width - UI.pad * 2 - 24) / 4,
    alignItems: "center",
    marginBottom: 12,
  },

  subCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  subCardImage: { width: 26, height: 26 },

  subCardText: {
    fontSize: 11.5,
    fontWeight: "900",
    color: COLORS.subText,
    textAlign: "center",
  },

  bannerContainer: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
});