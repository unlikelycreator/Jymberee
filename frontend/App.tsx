import "react-native-gesture-handler";
import "react-native-get-random-values";
import { requestTrackingPermission } from "react-native-tracking-transparency";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Modal,
  View,
  Text,
  DeviceEventEmitter,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from "react-native";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";

import { getApp } from "@react-native-firebase/app";
import { getMessaging } from "@react-native-firebase/messaging";

import AsyncStorage from "@react-native-async-storage/async-storage";

import AppNavigator from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { LocationProvider } from "./src/context/LocationContext";

import {
  getFCMToken,
  registerNotificationListeners,
  setNavigationRef,
  listenForFCMTokenRefresh,
} from "./src/utils/firebase";

/* -------------------- TYPES -------------------- */
type RootStackParamList = {
  Map: undefined;
};

const navigationRef = createNavigationContainerRef<RootStackParamList>();

/* -------------------- AUTO CLOSE ALERT -------------------- */
interface AutoCloseAlertProps {
  visible: boolean;
  message: string;
  onClose: () => void;
  type?: "success" | "error";
}

const AutoCloseAlert: React.FC<AutoCloseAlertProps> = ({
  visible,
  message,
  onClose,
  type = "success",
}) => {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(onClose, 2500);
      return () => clearTimeout(t);
    }
  }, [visible, onClose]);

  const bg = type === "success" ? "#0ef388" : "#ff4d4f";

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.alertOverlay}>
        <View style={[styles.alertBox, { backgroundColor: bg }]}>
          <Text style={styles.alertText}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

/* -------------------- LOADING MODAL -------------------- */
const GlobalLoading: React.FC<{ visible: boolean; message?: string }> = ({
  visible,
  message = "Sending SOS...",
}) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

/* -------------------- REQUEST NOTIFICATION PERMISSION -------------------- */
const requestNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === "android") {
    if (Platform.Version >= 33) {
      // Android 13+ (API 33+) requires POST_NOTIFICATIONS permission
      try {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error("Permission request error:", error);
        return false;
      }
    }
  }
  return true;
};

/* -------------------- APP -------------------- */
const App = () => {
  const [isSendingSOS, setIsSendingSOS] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("✅ SOS sent successfully");
  const [alertType, setAlertType] = useState<"success" | "error">("success");

  /* ✅ GLOBAL EVENTS */
  useEffect(() => {
    const subSending = DeviceEventEmitter.addListener(
      "SOS_SENDING",
      () => {
        setIsSendingSOS(true);
      }
    );

    const subSent = DeviceEventEmitter.addListener(
      "SOS_SENT",
      (payload?: { message?: string }) => {
        setIsSendingSOS(false);
        setAlertType("success");
        setAlertMessage(payload?.message || "✅ SOS sent successfully");
        setShowAlert(true);
      }
    );

    const subFailed = DeviceEventEmitter.addListener(
      "SOS_FAILED",
      (payload?: { message?: string }) => {
        setIsSendingSOS(false);
        setAlertType("error");
        setAlertMessage(payload?.message || "❌ SOS failed. Please try again.");
        setShowAlert(true);
      }
    );

    return () => {
      subSending.remove();
      subSent.remove();
      subFailed.remove();
    };
  }, []);

  /* -------------------- TRACKING PERMISSION -------------------- */
  useEffect(() => {
    const getPermission = async () => {
      const status = await requestTrackingPermission();
      console.log("Tracking permission:", status);
    };
    getPermission();
  }, []);

  /* -------------------- FCM -------------------- */
  useEffect(() => {
    const initFCM = async () => {
      try {
        const messaging = getMessaging(getApp());

        // Request notification permission (Android 13+)
        const notificationPermissionGranted =
          await requestNotificationPermission();
        if (!notificationPermissionGranted) {
          console.log("Notification permission not granted");
        }

        // Get token and store only locally
        const token = await getFCMToken();
        if (token) {
          await AsyncStorage.setItem("fcmToken", token);
          console.log("✅ FCM Token stored locally");
        }
      } catch (e) {
        console.log("FCM init error", e);
      }
    };

    initFCM();

    // Token refresh - only store locally
    const unsubRefresh = listenForFCMTokenRefresh(async (token) => {
      await AsyncStorage.setItem("fcmToken", token);
      console.log("✅ FCM Token refreshed and stored locally");
    });

    const unsubNotif = registerNotificationListeners();

    return () => {
      unsubRefresh();
      unsubNotif();
    };
  }, []);

  /* -------------------- UI -------------------- */
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <LocationProvider>
          <SafeAreaView
            style={styles.safeArea}
            edges={["top", "left", "right", "bottom"]}
          >
            <AuthProvider>
              <NavigationContainer
                ref={navigationRef}
                onReady={() => setNavigationRef(navigationRef)}
              >
                <AppNavigator />
              </NavigationContainer>
            </AuthProvider>
          </SafeAreaView>
        </LocationProvider>
      </SafeAreaProvider>

      {/* Global Loader */}
      <GlobalLoading visible={isSendingSOS} message="Sending SOS..." />

      {/* Global Alert */}
      <AutoCloseAlert
        visible={showAlert}
        message={alertMessage}
        type={alertType}
        onClose={() => setShowAlert(false)}
      />
    </GestureHandlerRootView>
  );
};

/* -------------------- STYLES -------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF00" },
  safeArea: { flex: 1, backgroundColor: "#89878740" },

  alertOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  alertBox: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  alertText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },

  loadingOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  loadingBox: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 220,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
});

export default App;