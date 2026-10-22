import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Vibration,
  Animated,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowLeft, User, Mail, PhoneCall, MapPin, Check } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import api from "../utils/api";
import { RootStackParamList } from "../navigation/AppNavigator";

interface UserData {
  fullName: string;
  email: string;
  phoneNumber: string;
  postalCode: string;
  profilePicture: string;
  preferredLocations: { street: string; city: string; state: string; postalCode: string }[];
  emergencyContacts: { name: string; number: string; _id: string }[];
}

interface PersonalInfoScreenProps {
  handleLogout: () => void;
}

const COLORS = {
  bg: "#F6F7FB",
  surface: "#FFFFFF",
  text: "#0F172A",
  subText: "rgba(15,23,42,0.65)",
  muted: "rgba(15,23,42,0.50)",
  border: "rgba(15,23,42,0.08)",
  primary: "#0EF388",
  primarySoft: "rgba(14,243,136,0.16)",
  danger: "#ef4444",
};

const UI = {
  pad: 16,
  r: 16,
  r2: 22,
};

const PersonalInfoScreen: React.FC<PersonalInfoScreenProps> = () => {
  const [userData, setUserData] = useState<UserData>({
    fullName: "",
    email: "",
    phoneNumber: "",
    postalCode: "",
    profilePicture: "",
    preferredLocations: [{ street: "", city: "", state: "", postalCode: "" }],
    emergencyContacts: [{ name: "", number: "", _id: "" }],
  });

  const [loading, setLoading] = useState<boolean>(false);
  const { user, setUser } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // ✅ stable animation value
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userString = await AsyncStorage.getItem("user");
        if (userString) {
          const parsedUser = JSON.parse(userString);
          setUserData({
            fullName: parsedUser.name || "",
            email: parsedUser.email || "",
            phoneNumber: parsedUser.phoneNumber || "",
            postalCode: parsedUser.postalCode || "",
            profilePicture: parsedUser.profilePicture || "",
            preferredLocations: parsedUser.preferredLocations?.length
              ? parsedUser.preferredLocations
              : [{ street: "", city: "", state: "", postalCode: "" }],
            emergencyContacts: parsedUser.emergencyContacts?.length
              ? parsedUser.emergencyContacts
              : [{ name: "", number: "", _id: "" }],
          });
          setUser(parsedUser);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        Alert.alert("Error", "Failed to load user data");
      }
    };

    fetchUserData();
  }, [setUser]);

  const handleSave = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        Alert.alert("Error", "Please enter a valid email address");
        setLoading(false);
        return;
      }

      const requiredFields = [userData.fullName, userData.email];
      if (requiredFields.some((field) => !field?.trim())) {
        Alert.alert("Error", "Please fill in all required fields (Name and Email)");
        setLoading(false);
        return;
      }

      const response = await api.put("/auth/update-profile", {
        name: userData.fullName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        postalCode: userData.postalCode,
        preferredLocations: userData.preferredLocations,
      });

      if (response.status === 200) {
        Vibration.vibrate(70);
        Alert.alert("Success", "Profile updated successfully");

        // store updated user
        await AsyncStorage.setItem("user", JSON.stringify(response.data.user));

        // ✅ keep consistent with your auth state
        setUser(response.data.user);

        setUserData((prev) => ({
          ...prev,
          fullName: response.data.user?.name ?? prev.fullName,
          email: response.data.user?.email ?? prev.email,
          phoneNumber: response.data.user?.phoneNumber ?? prev.phoneNumber,
          postalCode: response.data.user?.postalCode ?? prev.postalCode,
          preferredLocations:
            response.data.user?.preferredLocations ?? prev.preferredLocations,
          emergencyContacts:
            response.data.user?.emergencyContacts ?? prev.emergencyContacts,
          profilePicture: response.data.user?.profilePicture ?? prev.profilePicture,
        }));
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", error.response?.data?.message || "Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              Vibration.vibrate(25);
              navigation.navigate("Profile");
            }}
            activeOpacity={0.85}
          >
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Personal Info</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Update your details</Text>
          <Text style={styles.cardSubtitle}>Keep your profile accurate for faster help.</Text>

          {/* NAME */}
          <View style={styles.field}>
            <View style={styles.iconBox}>
              <User size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                placeholderTextColor={"rgba(15,23,42,0.35)"}
                value={userData.fullName}
                onChangeText={(text) => setUserData((p) => ({ ...p, fullName: text }))}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* EMAIL (locked) */}
          <View style={[styles.field, styles.disabledField]}>
            <View style={styles.iconBox}>
              <Mail size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                placeholder="Email"
                placeholderTextColor={"rgba(15,23,42,0.35)"}
                value={userData.email}
                onChangeText={(text) => setUserData((p) => ({ ...p, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={false}
              />
            </View>
          </View>

          {/* PHONE (locked) */}
          <View style={[styles.field, styles.disabledField]}>
            <View style={styles.iconBox}>
              <PhoneCall size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                placeholder="Phone number"
                placeholderTextColor={"rgba(15,23,42,0.35)"}
                value={userData.phoneNumber}
                onChangeText={(text) => setUserData((p) => ({ ...p, phoneNumber: text }))}
                keyboardType="phone-pad"
                editable={false}
              />
            </View>
          </View>

          {/* POSTAL */}
          <View style={styles.field}>
            <View style={styles.iconBox}>
              <MapPin size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Postal Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter postal code"
                placeholderTextColor={"rgba(15,23,42,0.35)"}
                value={userData.postalCode}
                onChangeText={(text) => setUserData((p) => ({ ...p, postalCode: text }))}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* SAVE */}
          <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 14 }}>
            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.75 }]}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator size="small" color={"#052E16"} />
              ) : (
                <Check size={18} color={"#052E16"} />
              )}
              <Text style={styles.saveText}>{loading ? "Saving..." : "Save Profile"}</Text>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.note}>
            * Email and phone are locked for security.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  scrollContainer: {
    paddingHorizontal: UI.pad,
    paddingTop: Platform.OS === "ios" ? 18 : 18,
    paddingBottom: 22,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  backBtn: {
    width: 40,
    height: 40,
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

  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: UI.r2,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
  },

  cardSubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.subText,
    marginBottom: 12,
  },

  field: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: UI.r,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "#F8FAFC",
    marginBottom: 10,
  },

  disabledField: {
    backgroundColor: "#F3F4F6",
  },

  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    fontSize: 11.5,
    fontWeight: "900",
    color: COLORS.muted,
    marginBottom: 4,
  },

  input: {
    paddingVertical: 0,
    fontSize: 14.5,
    fontWeight: "800",
    color: COLORS.text,
  },

  disabledInput: {
    color: "rgba(15,23,42,0.70)",
  },

  saveBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },

  saveText: {
    fontSize: 14.5,
    fontWeight: "900",
    color: "#052E16",
  },

  note: {
    marginTop: 12,
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.muted,
  },
});

export default PersonalInfoScreen;
