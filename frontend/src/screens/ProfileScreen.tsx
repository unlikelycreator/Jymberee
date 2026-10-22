import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Vibration,
  Dimensions,
  Animated,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "react-native-image-picker";
import {
  ArrowLeft,
  Camera,
  User,
  PhoneCall,
  Mail,
  MapPin,
  X,
  ShieldAlert,
  ChevronRight,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import api from "../utils/api";

type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
  PersonalInfo: undefined;
  Location: undefined;
  ResetPassword: undefined;
  EmergencyContacts: undefined;
  Privacy: undefined;
  DeleteAccount: undefined;
  rapescreen: undefined;
  CrimeScreen: undefined;
  Medical: undefined;
  FireScreen: undefined;
  "first-aid-guide": undefined;
  "safety-tips": undefined;
  "fire-safety-tips": undefined;
  Other: undefined;
  Emergency: undefined;
};

interface Location {
  street: string;
  city: string;
  state: string;
  postalCode: string;
}

interface EmergencyContact {
  name: string;
  number: string;
  _id: string;
}

interface UserData {
  fullName: string;
  email: string;
  phoneNumber: string;
  postalCode: string;
  profilePicture: string;
  preferredLocations: Location[];
  emergencyContacts: EmergencyContact[];
}

interface ProfileScreenProps {
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

const ProfileScreen: React.FC<ProfileScreenProps> = ({ handleLogout }) => {
  const [userData, setUserData] = useState<UserData>({
    fullName: "",
    email: "",
    phoneNumber: "",
    postalCode: "",
    profilePicture: "",
    preferredLocations: [{ street: "", city: "", state: "", postalCode: "" }],
    emergencyContacts: [{ name: "", number: "", _id: "" }],
  });

  const [imageUploading, setImageUploading] = useState<boolean>(false);
  const [showImagePickerModal, setShowImagePickerModal] =
    useState<boolean>(false);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const { user, setUser } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // ✅ keep animated value stable
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

  const handleImageSelection = async (source: "camera" | "gallery") => {
    const options:
      | ImagePicker.ImageLibraryOptions
      | ImagePicker.CameraOptions = {
      mediaType: "photo",
      maxHeight: 1024,
      maxWidth: 1024,
      quality: 0.7,
      includeBase64: true,
    };

    try {
      setImageUploading(true);

      let response: ImagePicker.ImagePickerResponse;
      if (source === "camera") {
        response = await ImagePicker.launchCamera(options);
      } else {
        response = await ImagePicker.launchImageLibrary(options);
      }

      if (response.didCancel) {
        // user cancelled
      } else if (response.errorCode) {
        Alert.alert("Error", "Failed to pick image");
      } else if (
        response.assets &&
        response.assets[0] &&
        response.assets[0].base64
      ) {
        const base64DataUrl = `data:image/jpeg;base64,${response.assets[0].base64}`;
        const payload = { image: base64DataUrl };

        const uploadResponse = await api.post<{ profilePicture?: string }>(
          "/images/profilepic",
          payload
        );

        if (uploadResponse.data.profilePicture) {
          const profilePictureUrl = `${uploadResponse.data.profilePicture}?t=${Date.now()}`;

          setUserData((prev) => ({ ...prev, profilePicture: profilePictureUrl }));

          const updatedUser = { ...(user || {}), profilePicture: profilePictureUrl };
          await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
          setUser(updatedUser);

          Vibration.vibrate(100);
          Alert.alert("Success", "Profile picture uploaded successfully");
        } else {
          Alert.alert(
            "Error",
            "Failed to retrieve profile picture URL from server"
          );
        }
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Error", "Failed to upload profile picture");
    } finally {
      setImageUploading(false);
      setShowImagePickerModal(false);
    }
  };

  const selectImage = () => {
    Vibration.vibrate(50);
    setShowImagePickerModal(true);
  };

  const openImageModal = () => {
    if (!userData.profilePicture) return;

    Vibration.vibrate(30);
    Image.getSize(
      userData.profilePicture,
      (width, height) => {
        setImageDimensions({ width, height });
        setShowImageModal(true);
      },
      (error) => {
        console.error("Error fetching image dimensions:", error);
        Alert.alert("Error", "Failed to load image dimensions");
      }
    );
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

  const { modalWidth, modalHeight } = useMemo(() => {
    const screenWidth = Dimensions.get("window").width;
    const screenHeight = Dimensions.get("window").height;
    const maxModalWidth = screenWidth * 0.9;
    const maxModalHeight = screenHeight * 0.8;

    let w = maxModalWidth;
    let h = maxModalHeight;

    if (imageDimensions) {
      const aspectRatio = imageDimensions.width / imageDimensions.height;
      w = Math.min(imageDimensions.width, maxModalWidth);
      h = Math.min(w / aspectRatio, maxModalHeight);

      if (h * aspectRatio > maxModalWidth) {
        h = Math.min(imageDimensions.height, maxModalHeight);
        w = h * aspectRatio;
      }
    }

    return { modalWidth: w, modalHeight: h };
  }, [imageDimensions]);

  const options = useMemo(
    () => [
      {
        key: "personal",
        label: "Personal Information",
        icon: <User size={18} color={COLORS.primary} />,
        onPress: () => navigation.navigate("PersonalInfo"),
      },
      {
        key: "emergency",
        label: "Emergency Contacts",
        icon: <PhoneCall size={18} color={COLORS.primary} />,
        onPress: () => navigation.navigate("EmergencyContacts"),
      },
      {
        key: "location",
        label: "Manage Locations",
        icon: <MapPin size={18} color={COLORS.primary} />,
        onPress: () => navigation.navigate("Location"),
      },
      {
        key: "reset",
        label: "Reset Password",
        icon: <Mail size={18} color={COLORS.primary} />,
        onPress: () => navigation.navigate("ResetPassword"),
      },
      {
        key: "privacy",
        label: "Account & Privacy",
        icon: <ShieldAlert size={18} color={COLORS.primary} />,
        onPress: () => navigation.navigate("Privacy"),
      },
    ],
    [navigation]
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.bg}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              Vibration.vibrate(30);
              navigation.navigate("Home");
            }}
            activeOpacity={0.85}
          >
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* PROFILE CARD */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {imageUploading ? (
              <View style={styles.avatarCircle}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : userData.profilePicture ? (
              <TouchableOpacity activeOpacity={0.9} onPress={openImageModal}>
                <Image
                  source={{ uri: userData.profilePicture, cache: "reload" as any }}
                  style={styles.avatar}
                  onError={() => {
                    setUserData((prev) => ({ ...prev, profilePicture: "" }));
                    Alert.alert("Error", "Failed to load profile image");
                  }}
                />
              </TouchableOpacity>
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: COLORS.primarySoft }]}>
                <User size={34} color={COLORS.text} />
              </View>
            )}

            {/* edit camera chip */}
            <TouchableOpacity
              onPress={selectImage}
              activeOpacity={0.9}
              style={styles.cameraChip}
            >
              <Camera size={16} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.nameText}>
              {userData.fullName || "User Name"}
            </Text>
            <Text style={styles.subText} numberOfLines={1}>
              {userData.email || "Add your email"}
            </Text>

            {!!userData.phoneNumber && (
              <Text style={styles.subText} numberOfLines={1}>
                {userData.phoneNumber}
              </Text>
            )}
          </View>
        </View>

        {/* OPTIONS GROUP */}
        <Text style={styles.sectionLabel}>Settings</Text>

        <View style={styles.listCard}>
          {options.map((item, index) => {
            const isLast = index === options.length - 1;
            return (
              <Animated.View
                key={item.key}
                style={{ transform: [{ scale: buttonScale }] }}
              >
                <TouchableOpacity
                  style={[styles.row, !isLast && styles.rowDivider]}
                  onPressIn={handlePressIn}
                  onPressOut={() => {
                    handlePressOut();
                    Vibration.vibrate(20);
                    item.onPress();
                  }}
                  activeOpacity={0.9}
                >
                  <View style={styles.rowLeft}>
                    <View style={styles.iconBox}>{item.icon}</View>
                    <Text style={styles.rowText}>{item.label}</Text>
                  </View>
                  <ChevronRight size={18} color={"rgba(15,23,42,0.35)"} />
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* SIGN OUT */}
        <Text style={styles.sectionLabel}>Account</Text>

        <TouchableOpacity
          style={styles.signOutBtn}
          activeOpacity={0.9}
          onPress={() => {
            Vibration.vibrate(30);
            handleLogout();
          }}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 18 }} />
      </ScrollView>

      {/* FULL IMAGE MODAL */}
      <Modal
        animationType="fade"
        transparent
        visible={showImageModal}
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.imageModalContainer,
              imageDimensions && { width: modalWidth, height: modalHeight },
            ]}
          >
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                Vibration.vibrate(30);
                setShowImageModal(false);
                setImageDimensions(null);
              }}
              activeOpacity={0.9}
            >
              <View style={styles.closeButtonBackground}>
                <X size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <Image
              source={{ uri: userData.profilePicture }}
              style={[
                styles.fullImage,
                imageDimensions && { width: modalWidth, height: modalHeight },
              ]}
              resizeMode="contain"
              onError={() => {
                Alert.alert("Error", "Failed to load profile image");
                setShowImageModal(false);
                setImageDimensions(null);
              }}
            />
          </View>
        </View>
      </Modal>

      {/* IMAGE PICKER MODAL */}
      <Modal
        animationType="fade"
        transparent
        visible={showImagePickerModal}
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <View style={styles.modalOverlayLight}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Choose Image Source</Text>

            <View style={styles.pickerRow}>
              <TouchableOpacity
                style={[styles.pickerBtn, { backgroundColor: COLORS.text }]}
                onPress={() => {
                  Vibration.vibrate(30);
                  handleImageSelection("camera");
                }}
                activeOpacity={0.9}
              >
                <Camera size={18} color="#FFFFFF" />
                <Text style={styles.pickerBtnText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pickerBtn, { backgroundColor: COLORS.primary }]}
                onPress={() => {
                  Vibration.vibrate(30);
                  handleImageSelection("gallery");
                }}
                activeOpacity={0.9}
              >
                <Text style={[styles.pickerBtnText, { color: "#052E16" }]}>
                  Gallery
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.pickerCancel}
              onPress={() => {
                Vibration.vibrate(20);
                setShowImagePickerModal(false);
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

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

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: UI.r2,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    marginBottom: 16,
  },

  avatarWrap: {
    width: 82,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
  },

  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },

  avatarCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cameraChip: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 3,
  },

  nameText: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
  },

  subText: {
    marginTop: 4,
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.subText,
  },

  sectionLabel: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  listCard: {
    backgroundColor: COLORS.surface,
    borderRadius: UI.r2,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },

  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15,23,42,0.06)",
  },

  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },

  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  rowText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: COLORS.text,
    flex: 1,
  },

  signOutBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: UI.r2,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.22)",
    paddingVertical: 14,
    alignItems: "center",
  },

  signOutText: {
    fontSize: 14.5,
    fontWeight: "900",
    color: COLORS.danger,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },

  modalOverlayLight: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },

  imageModalContainer: {
    backgroundColor: "#0B0B0B",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    padding: 10,
    overflow: "hidden",
  },

  fullImage: { borderRadius: 12 },

  modalCloseButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
  },

  closeButtonBackground: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  pickerCard: {
    width: "92%",
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  pickerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 14,
  },

  pickerRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  pickerBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  pickerBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  pickerCancel: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
    backgroundColor: "#F3F4F6",
  },

  pickerCancelText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
});

export default ProfileScreen;
