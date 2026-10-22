// RegisterScreen.tsx — FULL UPDATED
// ✅ Required (*) is RED (labels + placeholders cleaned)
// ✅ Emergency Contacts has an Info indicator like Preferred Location
// ✅ Emergency Info modal explains Manual Contact + Import Phone Book flow

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
  Alert,
  FlatList,
  StatusBar,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Eye,
  User,
  Mail,
  EyeOff,
  MapPin,
  Info,
  ChevronDown,
  Contact as ContactIcon,
  Search,
  X,
  CheckCheck,
  Trash2,
  Plus,
  ChevronUp,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import api from "../utils/api";
import PhoneInput, {
  isValidPhoneNumber,
} from "react-native-international-phone-number";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import type { ICountry } from "react-native-international-phone-number";
import { getFCMToken, registerNotificationListeners } from "../utils/firebase";
import CountryStateCityPicker from "../components/CountryStateCityPickerLocation";
import Contacts from "@s77rt/react-native-contacts";
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  openSettings,
} from "react-native-permissions";

interface RegisterScreenProps {
  setIsLoggedIn: (isLoggedIn: boolean) => void;
}
type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface Location {
  country: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
}

interface EmergencyContact {
  name: string;
  number: string;
  countryCode?: string;
}

interface RegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
    status: string;
    referralCode: string;
  };
}

interface VerifyOTPResponse {
  token: string;
  user: {
    name: string;
    email: string;
    phoneNumber: string;
    status: string;
    preferredLocations?: Location[];
    emergencyContacts?: EmergencyContact[];
  };
}

interface PhoneContact {
  name: string;
  number: string;
}

const ErrorBanner = ({ message }: { message: string }) => {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <View style={styles.errorIndicator} />
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
};

const FieldLabel = ({
  label,
  required,
  style,
}: {
  label: string;
  required?: boolean;
  style?: any;
}) => {
  return (
    <Text style={[styles.fieldLabel, style]}>
      {label}
      {required ? <Text style={styles.requiredStar}> *</Text> : null}
    </Text>
  );
};

const RegisterScreen: React.FC<RegisterScreenProps> = ({ setIsLoggedIn }) => {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(null);

  const [preferredLocation, setPreferredLocation] = useState<Location>({
    country: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
  });

  const [emergencyContactsList, setEmergencyContactsList] = useState<
    EmergencyContact[]
  >([]);
  const [emergencyContactCountry, setEmergencyContactCountry] =
    useState<ICountry | null>(null);

  const [emName, setEmName] = useState("");
  const [emNumber, setEmNumber] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPreferred, setShowPreferred] = useState(false);

  const [showEmergency, setShowEmergency] = useState(false);
  const [showEmergencyInfoModal, setShowEmergencyInfoModal] = useState(false);

  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [otpError, setOtpError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const { setUser, setEmergencyContacts } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const infoModalAnim = useRef(new Animated.Value(0)).current;

  const scrollViewRef = useRef<ScrollView>(null);
  const sectionRefs = useRef<{ [key: string]: View | null }>({});
  const refs = Array(6)
    .fill(0)
    .map(() => useRef<TextInput>(null));

  const [contactModal, setContactModal] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [phoneContacts, setPhoneContacts] = useState<PhoneContact[]>([]);
  const [selectedPhoneContacts, setSelectedPhoneContacts] = useState<
    PhoneContact[]
  >([]);

  useEffect(() => {
    if (showOtpModal || showInfoModal || contactModal || showEmergencyInfoModal) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 55,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [
    showOtpModal,
    showInfoModal,
    contactModal,
    showEmergencyInfoModal,
    fadeAnim,
    scaleAnim,
  ]);

  useEffect(() => {
    Animated.timing(infoModalAnim, {
      toValue: showInfoModal ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showInfoModal, infoModalAnim]);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleFocus = (field: string) => setFocusedInput(field);
  const handleBlur = () => setFocusedInput(null);

  const handleLocationChange = (field: keyof Location, value: string) => {
    setPreferredLocation((prev) => ({ ...prev, [field]: value }));
  };

  const handlePickerChange = useCallback(
    ({
      country,
      state,
      city,
    }: {
      country: string;
      state: string;
      city: string;
    }) => {
      setPreferredLocation((prev) => ({ ...prev, country, state, city }));
    },
    []
  );

  async function sendFcmTokenToBackend(fcmToken: string) {
    try {
      // your API call here
    } catch (err) {
      console.error("Error sending FCM token:", err);
    }
  }

  const normalizeToE164 = useCallback((raw: string, countryRoot?: string) => {
    const input = (raw || "").trim();
    if (!input) return "";

    const root = (countryRoot || "").trim();
    const rootDigits = root.replace(/[^\d]/g, "");

    const startsPlus = input.startsWith("+");
    const digits = input.replace(/[^\d]/g, "");
    if (!digits) return "";

    if (startsPlus) return `+${digits}`;

    const local = digits.replace(/^0+/, "");
    if (!local) return rootDigits ? `+${rootDigits}` : "";

    if (rootDigits) return `+${rootDigits}${local}`;
    return `+${local}`;
  }, []);

  const requestContactsPermission = useCallback(async (): Promise<boolean> => {
    try {
      const perm =
        Platform.OS === "android"
          ? PERMISSIONS.ANDROID.READ_CONTACTS
          : PERMISSIONS.IOS.CONTACTS;

      let status = await check(perm);

      if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) return true;

      if (status === RESULTS.DENIED) {
        status = await request(perm);
        return status === RESULTS.GRANTED || status === RESULTS.LIMITED;
      }

      if (status === RESULTS.BLOCKED) {
        Alert.alert(
          "Permission Required",
          "Contacts permission is blocked. Please enable it from Settings to import contacts.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => openSettings().catch(() => {}),
            },
          ]
        );
        return false;
      }

      Alert.alert(
        "Contacts Unavailable",
        "Contacts access is not available on this device."
      );
      return false;
    } catch (e) {
      console.log("Contacts permission error:", e);
      Alert.alert("Error", "Failed to request contacts permission.");
      return false;
    }
  }, []);

  const pickBestNumber = useCallback((phoneNumbers: any[]) => {
    if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) return "";
    for (const p of phoneNumbers) {
      const val = (p?.value || "").trim();
      if (val) return val;
    }
    return "";
  }, []);

  const fetchPhoneContacts = useCallback(async () => {
    setContactLoading(true);

    const ok = await requestContactsPermission();
    if (!ok) {
      setContactLoading(false);
      return;
    }

    try {
      const list = await Contacts.getAll(["firstName", "lastName", "phoneNumbers"]);

      const defaultRoot =
        emergencyContactCountry?.idd?.root ?? selectedCountry?.idd?.root ?? "";

      const formatted: PhoneContact[] = (list || [])
        .map((c: any) => {
          const first = (c.firstName || "").trim();
          const last = (c.lastName || "").trim();
          const fullName = `${first} ${last}`.trim() || "Unknown";

          const rawNumber = pickBestNumber(c.phoneNumbers);
          const number = normalizeToE164(rawNumber, defaultRoot);

          return number ? { name: fullName, number } : null;
        })
        .filter(Boolean) as PhoneContact[];

      setPhoneContacts(formatted);
      setSelectedPhoneContacts([]);
      setContactSearch("");
      setContactModal(true);

      setShowEmergency(true);

      if (formatted.length === 0) {
        Alert.alert(
          "No Contacts Found",
          "No valid contacts with phone numbers were found."
        );
      }
    } catch (e) {
      console.log("Fetch contacts error:", e);
      Alert.alert("Error", "Failed to fetch contacts.");
    } finally {
      setContactLoading(false);
    }
  }, [
    pickBestNumber,
    requestContactsPermission,
    normalizeToE164,
    emergencyContactCountry,
    selectedCountry,
  ]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return phoneContacts;
    return phoneContacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.number.toLowerCase().includes(q)
    );
  }, [contactSearch, phoneContacts]);

  const togglePhoneContact = useCallback((c: PhoneContact) => {
    setSelectedPhoneContacts((prev) => {
      const exists = prev.some((x) => x.number === c.number);
      if (exists) return prev.filter((x) => x.number !== c.number);
      return [...prev, c];
    });
  }, []);

  const addSelectedContactsToEmergencyList = useCallback(() => {
    if (selectedPhoneContacts.length === 0) {
      Alert.alert("No Selection", "Please select at least one contact.");
      return;
    }

    setEmergencyContactsList((prev) => {
      const map = new Map<string, EmergencyContact>();
      prev.forEach((x) => map.set(x.number, x));

      selectedPhoneContacts.forEach((c) => {
        map.set(c.number, {
          name: c.name,
          number: c.number,
          countryCode: emergencyContactCountry?.idd?.root ?? selectedCountry?.idd?.root ?? "",
        });
      });

      return Array.from(map.values());
    });

    setErrors((prev) => {
      const next = { ...prev };
      delete next.emergencyContacts;
      delete next.general;
      return next;
    });

    setContactModal(false);
    setSelectedPhoneContacts([]);
  }, [selectedPhoneContacts, emergencyContactCountry, selectedCountry]);

  const removeEmergencyContact = useCallback((index: number) => {
    setEmergencyContactsList((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addEmergencyManual = useCallback(() => {
    const nm = emName.trim();
    const num = emNumber.trim();

    if (!nm) {
      Alert.alert("Invalid", "Please enter emergency contact name.");
      return;
    }
    if (!num) {
      Alert.alert("Invalid", "Please enter emergency contact number.");
      return;
    }

    const root = emergencyContactCountry?.idd?.root ?? selectedCountry?.idd?.root ?? "";
    const formattedNum = normalizeToE164(num, root);

    if (!formattedNum || formattedNum.length < 8) {
      Alert.alert("Invalid", "Please enter a valid emergency contact number.");
      return;
    }

    setEmergencyContactsList((prev) => {
      const exists = prev.some((x) => x.number === formattedNum);
      if (exists) return prev;
      return [
        ...prev,
        {
          name: nm,
          number: formattedNum,
          countryCode: root || "",
        },
      ];
    });

    setEmName("");
    setEmNumber("");

    setErrors((prev) => {
      const next = { ...prev };
      delete next.emergencyContacts;
      return next;
    });

    setShowEmergency(true);
  }, [emName, emNumber, emergencyContactCountry, selectedCountry, normalizeToE164]);

  const handleRegister = async () => {
    setLoading(true);
    setErrors({});
    const newErrors: { [key: string]: string } = {};
    let firstErrorSection: string | null = null;

    if (name.trim().length < 3) {
      newErrors.name = "Name cannot be less than 3 characters";
      firstErrorSection = firstErrorSection || "name";
    }

    if (!phoneNumber || !selectedCountry || !isValidPhoneNumber(phoneNumber, selectedCountry)) {
      newErrors.phone = "Valid phone number is required";
      firstErrorSection = firstErrorSection || "phone";
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = "Valid email is required";
      firstErrorSection = firstErrorSection || "email";
    }

    if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      firstErrorSection = firstErrorSection || "password";
    }

    if (!postalCode.trim()) {
      newErrors.postalCode = "Postal code is required";
      firstErrorSection = firstErrorSection || "postalCode";
    }

    if (emergencyContactsList.length === 0) {
      newErrors.emergencyContacts = "At least 1 emergency contact is required";
      firstErrorSection = firstErrorSection || "emergencyContact";
      setShowEmergency(true);
    }

    setErrors(newErrors);

    if (firstErrorSection) {
      const ref = sectionRefs.current[firstErrorSection];
      if (ref) {
        ref.measureInWindow((x, y) => {
          scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
        });
      }
      setLoading(false);
      return;
    }

    try {
      const mainRoot = selectedCountry?.idd?.root ?? "";
      const formattedPhoneNumber = normalizeToE164(phoneNumber, mainRoot);

      if (!formattedPhoneNumber) {
        setErrors({ phone: "Valid phone number is required" });
        setLoading(false);
        return;
      }

      const defaultEmergencyRoot =
        emergencyContactCountry?.idd?.root ?? selectedCountry?.idd?.root ?? "";

      const formattedEmergencyContacts = emergencyContactsList
        .map((c) => {
          const num = normalizeToE164(c.number, c.countryCode || defaultEmergencyRoot);
          if (!num) return null;
          return {
            name: c.name?.trim(),
            number: num,
            countryCode: c.countryCode || defaultEmergencyRoot || "",
          };
        })
        .filter(Boolean) as EmergencyContact[];

      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        postalCode: postalCode.trim(),
        phoneNumber: formattedPhoneNumber,
        countryCode: mainRoot || "",
        preferredLocations: [preferredLocation],
        emergencyContacts: formattedEmergencyContacts,
        referralCode: referralCode?.trim() || undefined,
      };

      const response = await api.post<RegisterResponse>("/auth/register", payload);

      if (response.status === 201) {
        setSuccessMessage(response.data.message);
        setShowOtpModal(true);
        await AsyncStorage.setItem("tempUserEmail", response.data.user.email);
        await AsyncStorage.setItem("user", JSON.stringify(response.data.user));

        const initFCM = async () => {
          const token = await getFCMToken();
          if (token) await sendFcmTokenToBackend(token);
        };
        initFCM();
        await registerNotificationListeners();
      }
    } catch (error: any) {
      if (error.response) {
        const data = error.response.data || {};
        let backendErrorMessage = "Registration failed";

        if (typeof data.message === "string") backendErrorMessage = data.message;
        if (Array.isArray(data.formatted) && data.formatted.length > 0) {
          backendErrorMessage = data.formatted.map((item: any) => item.message).join("\n");
        }

        setErrors({ general: backendErrorMessage });
      } else if (error.request) {
        setErrors({ general: "Network error. Please check your connection." });
      } else {
        setErrors({ general: "An unexpected error occurred." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    setOtpError(null);
    try {
      const userEmail = await AsyncStorage.getItem("tempUserEmail");
      if (!userEmail) return setOtpError("No email found. Please register again.");

      const response = await api.delete("/auth/cancel-account", { data: { email: userEmail } });
      if (response.status === 200 || response.status === 204) {
        setSuccessMessage("Account cancellation successful");
        setShowOtpModal(false);
        setOtp(Array(6).fill(""));
        setEmail("");
        setTimeout(() => setSuccessMessage(null), 2000);
      }
    } catch (error: any) {
      setOtpError(error.response?.data?.error || "Failed to cancel account");
    } finally {
      setLoading(false);
      setTimeout(() => setOtpError(null), 2000);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) {
      setOtpError(`Please wait ${resendCooldown} seconds`);
      setTimeout(() => setOtpError(null), 3000);
      return;
    }

    setLoading(true);
    setOtpError(null);
    try {
      const userEmail = await AsyncStorage.getItem("tempUserEmail");
      if (!userEmail) return setOtpError("No email found. Please register again.");

      const response = await api.post("/auth/resend-otp", { email: userEmail });
      if (response.status === 200 || response.status === 201) {
        setSuccessMessage("OTP resent successfully");
        setResendCooldown(30);
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (error: any) {
      setOtpError(error.response?.data?.error || "Failed to resend OTP");
    } finally {
      setLoading(false);
      setTimeout(() => setOtpError(null), 5000);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1 || (text && !/^[0-9]$/.test(text))) return;
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) refs[index + 1].current?.focus();
    else if (!text && index > 0) refs[index - 1].current?.focus();
  };

  const handleOtpSubmit = async () => {
    setLoading(true);
    setOtpError(null);
    try {
      const otpCode = otp.join("");
      if (otpCode.length !== 6) return setOtpError("Please enter 6-digit OTP");

      const userEmail = await AsyncStorage.getItem("tempUserEmail");
      if (!userEmail) return setOtpError("Registration data not found");

      const response = await api.post<VerifyOTPResponse>("/auth/verify-otp", {
        email: userEmail,
        phoneNumber: phoneNumber,
        otp: otpCode,
      });

      if (response.status === 200) {
        const { token, user } = response.data;
        await AsyncStorage.setItem("token", token);
        await AsyncStorage.setItem("user", JSON.stringify(user));
        await AsyncStorage.setItem("isLoggedIn", "true");
        await AsyncStorage.removeItem("tempUserEmail");
        setIsLoggedIn(true);
        setUser(user);
        setShowOtpModal(false);
        setEmergencyContacts(user.emergencyContacts || []);
        setOtp(Array(6).fill(""));
      }
    } catch (error: any) {
      setOtpError(error.response?.data?.error || "OTP verification failed");
    } finally {
      setLoading(false);
      setTimeout(() => setOtpError(null), 2000);
    }
  };

  const closeContactModal = useCallback(() => {
    setContactModal(false);
    setContactSearch("");
  }, []);

  const formSections = [
    {
      id: "header",
      render: () => (
        <View style={styles.header}>
          <Text style={styles.registerText}>Create Account!</Text>
          <Text style={styles.welcomeText}>
            Join <Text style={styles.brand}>Jymberee</Text> today
          </Text>
        </View>
      ),
    },
    {
      id: "name",
      render: () => (
        <>
          <FieldLabel label="Full Name" required />
          <View
            style={[
              styles.inputContainer,
              focusedInput === "name" && styles.inputContainerFocused,
              errors.name && styles.inputError,
            ]}
          >
            <User color="#666" size={20} />
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              onFocus={() => handleFocus("name")}
              onBlur={handleBlur}
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </>
      ),
    },
    {
      id: "phone",
      render: () => (
        <>
          <FieldLabel label="Phone Number" required />
          <View style={[styles.phoneInputContainer, errors.phone && styles.inputError]}>
            <PhoneInput
              defaultCountry="IN"
              value={phoneNumber}
              phoneInputStyles={{
                container: {
                  backgroundColor: "#F9F9F9",
                  borderWidth: 1,
                  borderColor: "#e0e0e0",
                  borderRadius: 12,
                  height: 56,
                },
                flagContainer: {
                  borderTopLeftRadius: 7,
                  borderBottomLeftRadius: 7,
                  backgroundColor: "#F9F9F9",
                  justifyContent: "center",
                  height: 54,
                },
                caret: { color: "#333", fontSize: 16 },
                divider: { backgroundColor: "#ddd", width: 1, marginHorizontal: 8 },
                callingCode: { fontSize: 16, color: "#333", fontWeight: "500" },
                input: { color: "#333", fontSize: 16, height: 54 },
              }}
              placeholder="Enter phone number"
              onChangePhoneNumber={setPhoneNumber}
              selectedCountry={selectedCountry}
              onChangeSelectedCountry={setSelectedCountry}
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </>
      ),
    },
    {
      id: "email",
      render: () => (
        <>
          <FieldLabel label="Email Address" required />
          <View
            style={[
              styles.inputContainer,
              focusedInput === "email" && styles.inputContainerFocused,
              errors.email && styles.inputError,
            ]}
          >
            <Mail color="#666" size={20} />
            <TextInput
              style={styles.input}
              placeholder="Enter email address"
              placeholderTextColor="#999"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              onFocus={() => handleFocus("email")}
              onBlur={handleBlur}
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </>
      ),
    },
    {
      id: "password",
      render: () => (
        <>
          <FieldLabel label="Password" required />
          <View
            style={[
              styles.inputContainer,
              focusedInput === "password" && styles.inputContainerFocused,
              errors.password && styles.inputError,
            ]}
          >
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff color="#666" size={20} /> : <Eye color="#666" size={20} />}
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Minimum 6 characters"
              value={password}
              onChangeText={setPassword}
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              onFocus={() => handleFocus("password")}
              onBlur={handleBlur}
            />
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </>
      ),
    },
    {
      id: "referralCode",
      render: () => (
        <>
          <FieldLabel label="Referral Code (Optional)" />
          <View
            style={[
              styles.inputContainer,
              focusedInput === "referralCode" && styles.inputContainerFocused,
            ]}
          >
            <User color="#666" size={20} />
            <TextInput
              style={styles.input}
              placeholder="Enter referral code"
              placeholderTextColor="#999"
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
              maxLength={6}
              onFocus={() => handleFocus("referralCode")}
              onBlur={handleBlur}
            />
          </View>
        </>
      ),
    },
    {
      id: "postalCode",
      render: () => (
        <>
          <FieldLabel label="Postal Code" required />
          <View
            style={[
              styles.inputContainer,
              styles.flex1,
              focusedInput === "postalCode" && styles.inputContainerFocused,
              errors.postalCode && styles.inputError,
            ]}
          >
            <MapPin color="#666" size={16} />
            <TextInput
              style={styles.input}
              placeholder="Enter postal code"
              placeholderTextColor="#999"
              value={postalCode}
              onChangeText={setPostalCode}
              keyboardType="numeric"
              onFocus={() => handleFocus("postalCode")}
              onBlur={handleBlur}
            />
          </View>
          {errors.postalCode && <Text style={styles.errorText}>{errors.postalCode}</Text>}
        </>
      ),
    },

    {
      id: "emergencyContact",
      render: () => (
        <View style={styles.sectionContent}>
          <View style={styles.contactCard}>
            <TouchableOpacity
              onPress={() => setShowEmergency(!showEmergency)}
              style={styles.cardTitleContainer2}
              activeOpacity={0.9}
            >
              <Text style={styles.cardTitleToggle}>
                Emergency Contacts
                <Text style={styles.requiredStar}> *</Text>
              </Text>

              {/* ✅ Info indicator like Preferred Location */}
              <TouchableOpacity
                onPress={() => setShowEmergencyInfoModal(true)}
                activeOpacity={0.85}
                style={styles.emInfoBtn}
              >
                <Info color="#DC2626" size={16} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={fetchPhoneContacts}
                style={[styles.importBtn, (contactLoading || loading) && { opacity: 0.7 }]}
                disabled={contactLoading || loading}
                activeOpacity={0.9}
              >
                {contactLoading ? (
                  <ActivityIndicator size="small" color="#1E3A8A" />
                ) : (
                  <>
                    <ContactIcon color="#1E3A8A" size={16} />
                    <Text style={styles.importBtnText}>Import</Text>
                  </>
                )}
              </TouchableOpacity>

              {showEmergency ? (
                <ChevronUp
                  color="#090101"
                  size={24}
                  style={{ marginRight: -15, marginLeft: 10 }}
                />
              ) : (
                <ChevronDown
                  color="#090101"
                  size={24}
                  style={{ marginRight: -15, marginLeft: 10 }}
                />
              )}
            </TouchableOpacity>

            {showEmergency && (
              <View style={styles.contactCardBody}>
                <FieldLabel label="Contact Name" required style={{ marginBottom: 6 }} />
                <View style={styles.manualRow}>
                  <View style={[styles.inputContainer, { flex: 1, marginBottom: 10 }]}>
                    <User color="#666" size={16} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter contact name"
                      placeholderTextColor="#999"
                      value={emName}
                      onChangeText={setEmName}
                      onFocus={() => handleFocus("emName")}
                      onBlur={handleBlur}
                    />
                  </View>
                </View>

                <FieldLabel label="Contact Number" required style={{ marginBottom: 6 }} />
                <View style={[styles.phoneInputContainer, { marginBottom: 8 }]}>
                  <PhoneInput
                    defaultCountry="IN"
                    value={emNumber}
                    phoneInputStyles={{
                      container: {
                        backgroundColor: "#F9F9F9",
                        borderWidth: 1,
                        borderColor: "#e0e0e0",
                        borderRadius: 12,
                        height: 56,
                      },
                      flagContainer: {
                        borderTopLeftRadius: 7,
                        borderBottomLeftRadius: 7,
                        backgroundColor: "#F9F9F9",
                        justifyContent: "center",
                        height: 54,
                      },
                      caret: { color: "#333", fontSize: 16 },
                      divider: { backgroundColor: "#ddd", width: 1, marginHorizontal: 8 },
                      callingCode: { fontSize: 16, color: "#333", fontWeight: "500" },
                      input: { color: "#333", fontSize: 16, height: 54 },
                    }}
                    placeholder="Enter phone number"
                    onChangePhoneNumber={setEmNumber}
                    selectedCountry={emergencyContactCountry}
                    onChangeSelectedCountry={setEmergencyContactCountry}
                  />
                </View>

                <TouchableOpacity
                  style={styles.addMiniBtn}
                  onPress={addEmergencyManual}
                  activeOpacity={0.9}
                >
                  <Plus size={16} color="#1E3A8A" />
                  <Text style={styles.addMiniText}>Add Emergency Contact</Text>
                </TouchableOpacity>

                {errors.emergencyContacts && (
                  <Text style={styles.errorText}>{errors.emergencyContacts}</Text>
                )}

                {emergencyContactsList.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.smallLabel}>Added contacts</Text>

                    {emergencyContactsList.map((c, idx) => (
                      <View key={`${c.number}-${idx}`} style={styles.emRow}>
                        <View style={styles.emAvatar}>
                          <User size={16} color="#1E3A8A" />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.emName} numberOfLines={1}>
                            {c.name}
                          </Text>
                          <Text style={styles.emNum} numberOfLines={1}>
                            {c.number}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.removeBtn}
                          onPress={() => removeEmergencyContact(idx)}
                          activeOpacity={0.9}
                        >
                          <Trash2 size={16} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.tipRow} />
              </View>
            )}
          </View>
        </View>
      ),
    },

    {
      id: "preferredLocation",
      render: () => (
        <View style={styles.sectionContent}>
          <TouchableOpacity
            onPress={() => setShowPreferred(!showPreferred)}
            style={styles.cardTitleContainer}
            activeOpacity={0.9}
          >
            <Text style={[styles.cardTitle, { paddingHorizontal: 15 }]}>
              Preferred Location (Optional)
            </Text>

            <TouchableOpacity onPress={() => setShowInfoModal(true)} activeOpacity={0.8}>
              <Info color="#DC2626" size={16} style={styles.infoIcon} />
            </TouchableOpacity>

            {showPreferred ? (
              <ChevronUp color="#090101" size={24} style={{ marginLeft: "auto", marginTop: -20 }} />
            ) : (
              <ChevronDown color="#090101" size={24} style={{ marginLeft: "auto", marginTop: -20 }} />
            )}
          </TouchableOpacity>

          {showPreferred && (
            <View style={styles.locationCard}>
              <FieldLabel label="Street" style={{ marginBottom: 6 }} />
              <View style={styles.inputRow}>
                <View
                  style={[
                    styles.inputContainer,
                    styles.flex1,
                    focusedInput === "street" && styles.inputContainerFocused,
                  ]}
                >
                  <MapPin color="#666" size={16} />
                  <TextInput
                    style={styles.input}
                    placeholder="Street"
                    placeholderTextColor="#999"
                    value={preferredLocation.street}
                    onChangeText={(text) => handleLocationChange("street", text)}
                    onFocus={() => handleFocus("street")}
                    onBlur={handleBlur}
                  />
                </View>
              </View>

              <CountryStateCityPicker onChange={handlePickerChange} />

              <FieldLabel label="Postal Code" style={{ marginBottom: 6 }} />
              <View style={styles.inputRow}>
                <View
                  style={[
                    styles.inputContainer,
                    styles.flex1,
                    focusedInput === "postalCode2" && styles.inputContainerFocused,
                  ]}
                >
                  <MapPin color="#666" size={16} />
                  <TextInput
                    style={styles.input}
                    placeholder="Postal Code"
                    placeholderTextColor="#999"
                    value={preferredLocation.postalCode}
                    onChangeText={(text) => handleLocationChange("postalCode", text)}
                    keyboardType="numeric"
                    onFocus={() => handleFocus("postalCode2")}
                    onBlur={handleBlur}
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      ),
    },

    {
      id: "messages",
      render: () => (
        <>
          <ErrorBanner message={errors.general} />
          {successMessage && <Text style={styles.successText}>{successMessage}</Text>}
        </>
      ),
    },
    {
      id: "registerButton",
      render: () => (
        <>
          {loading ? (
            <ActivityIndicator size="large" color="#ff3b30" style={styles.loader} />
          ) : (
            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.9}
            >
              <Text style={styles.buttonText}>Create Account</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            style={styles.loginRedirect}
            activeOpacity={0.9}
          >
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginLink}>Login Here</Text>
            </Text>
            
          </TouchableOpacity>
          <Text style={styles.footerText}>© 2026 Ezeelink IT Solutions LLP 
            {"\n"}Designed & Developed by Ezeelink</Text>
        </>
      ),
    },
  ];
  

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.logoContainer}>
        <Image
          source={require("../assets/images/loginf.png")}
          style={styles.logoSize}
          resizeMode="contain"
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.contentContainer}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {formSections.map((section) => (
            <View
              key={section.id}
              ref={(ref) => {
                sectionRefs.current[section.id] = ref;
              }}
            >
              {section.render()}
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ✅ Contacts Import Modal */}
      <Modal
        visible={contactModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeContactModal}
      >
        <SafeAreaView
          style={[styles.contactModalWrap, { paddingTop: insets.top }]}
          edges={["top", "left", "right"]}
        >
          <View style={styles.contactModalHeader}>
            <Pressable
              style={styles.contactCloseBtn}
              onPress={closeContactModal}
              hitSlop={12}
              android_ripple={{ color: "rgba(15,23,42,0.08)", borderless: true }}
            >
              <X size={20} color="#0F172A" />
            </Pressable>

            <Text style={styles.contactModalTitle} numberOfLines={1}>
              Select Contacts
            </Text>

            <Pressable
              style={[
                styles.addSelectedBtn,
                selectedPhoneContacts.length === 0 && { opacity: 0.45 },
              ]}
              disabled={selectedPhoneContacts.length === 0}
              onPress={addSelectedContactsToEmergencyList}
              hitSlop={12}
              android_ripple={{ color: "rgba(5,46,22,0.10)", borderless: false }}
            >
              <Text style={styles.addSelectedText}>
                Add ({selectedPhoneContacts.length})
              </Text>
            </Pressable>
          </View>

          <View style={styles.contactSearchBar}>
            <Search size={18} color={"rgba(15,23,42,0.45)"} />
            <TextInput
              style={styles.contactSearchInput}
              placeholder="Search contacts..."
              value={contactSearch}
              onChangeText={setContactSearch}
              placeholderTextColor={"rgba(15,23,42,0.35)"}
              returnKeyType="search"
            />
          </View>

          <FlatList
            data={filteredContacts}
            keyExtractor={(item, index) => `${item.number}-${index}`}
            contentContainerStyle={{ paddingBottom: 14 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const selected = selectedPhoneContacts.some((x) => x.number === item.number);
              return (
                <Pressable
                  style={[styles.contactRow, selected && styles.contactRowSelected]}
                  onPress={() => togglePhoneContact(item)}
                >
                  <View style={styles.contactAvatar}>
                    <User size={16} color="#0F172A" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactRowName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.contactRowNumber} numberOfLines={1}>
                      {item.number}
                    </Text>
                  </View>

                  {selected ? (
                    <View style={styles.pickPill}>
                      <CheckCheck size={18} color="#0F172A" />
                    </View>
                  ) : (
                    <View style={styles.unpickPill} />
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyBox2}>
                <Text style={styles.emptyTitle2}>No contacts found</Text>
                <Text style={styles.emptySub2}>Try a different search.</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* ✅ OTP Modal */}
      <Modal
        visible={showOtpModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowOtpModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
            ]}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Verify Your Account</Text>
              <Text style={styles.modalSubtitle}>
                Enter the 6-digit code sent to {email}
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
                    selectionColor="#3C3C3C"
                    autoComplete="one-time-code"
                    onSubmitEditing={() =>
                      index < 5 ? refs[index + 1].current?.focus() : handleOtpSubmit()
                    }
                  />
                ))}
              </View>

              {otpError && <Text style={styles.errorText}>{otpError}</Text>}

              <TouchableOpacity
                style={[styles.submitOtpButton, loading && styles.submitOtpButtonDisabled]}
                onPress={handleOtpSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify OTP</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.resendButton,
                  (loading || resendCooldown > 0) && styles.resendButtonDisabled,
                ]}
                onPress={handleResendOtp}
                disabled={loading || resendCooldown > 0}
              >
                <Text style={styles.resendText}>
                  {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : "Resend OTP"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleCancel} style={styles.cancelButton} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Text style={styles.cancelText}>Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ✅ Preferred Location Info Modal */}
      <Modal
        visible={showInfoModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowInfoModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              { opacity: infoModalAnim, transform: [{ scale: scaleAnim }] },
            ]}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Preferred Location Details</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoItem}>
                  a. Preferred location is the specific area selected by the user where they wish to stay informed about offline marketing activities.
                </Text>
                <Text style={styles.infoItem}>
                  b. Users will receive notifications about campaigns, discounts, offers, and promotions happening in shops, malls, cafés, and other outlets within this location.
                </Text>
                <Text style={styles.infoItem}>
                  c. This ensures that users get personalized, location-based updates relevant to their chosen area of interest
                </Text>
              </View>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowInfoModal(false)}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ✅ Emergency Contacts Info Modal (NEW) */}
      <Modal
        visible={showEmergencyInfoModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowEmergencyInfoModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
            ]}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Emergency Contacts</Text>

              <View style={styles.infoContent}>
                <Text style={styles.infoItem}>
                  a. Emergency Contacts are used when you trigger SOS — your selected contacts can be notified.
                </Text>
                <Text style={styles.infoItem}>
                  b. You can add contacts in two ways:
                </Text>
                <Text style={styles.infoItem}>
                  • Manual Contact: Enter contact name + number, then tap “Add Emergency Contact”.
                </Text>
                 <Text style={styles.infoItemor}>
                   OR
                </Text>
                <Text style={styles.infoItem}>
                  • Import Phone Book: Tap “Import” to open your device contacts, select contacts, and tap “Add”.
                </Text>
                <Text style={styles.infoItem}>
                  c. Minimum 1 emergency contact is required to create an account.
                </Text>
                <Text style={[styles.infoItem, { color: "#b33737" }]}>
                  iOS users. Please choose **Allow Full Access** for best experience.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEmergencyInfoModal(false)}
              >
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  scrollView: { flex: 1 },
  scrollViewContent: { paddingHorizontal: 24, paddingBottom: 60 },
  logoContainer: { alignItems: "center", paddingVertical: 20, marginTop: 10 },
  logoSize: { width: 120, height: 120 },
  contentContainer: { flex: 1 },

  header: { alignItems: "flex-start", marginBottom: 18 },
  registerText: { color: "#1E3A8A", fontSize: 32, fontWeight: "700", marginBottom: 8 },
  welcomeText: { fontSize: 16, color: "#6B7280", lineHeight: 24 },
  brand: { fontWeight: "bold", color: "#3C3C3C" },

  fieldLabel: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    marginTop: 6,
  },
  requiredStar: { color: "#DC2626", fontWeight: "900" },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 56,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerFocused: { borderColor: "#1E3A8A", shadowOpacity: 0.2 },
  inputError: { borderColor: "#DC2626" },

  phoneInputContainer: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
    marginLeft: 10,
    paddingVertical: 0,
    height: 54,
  },
  flex1: { flex: 1 },
  inputRow: { flexDirection: "row", justifyContent: "space-between" },

  sectionContent: { marginBottom: 20, marginTop: 20 },

  locationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  contactCardBody: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  contactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
  },

  cardTitleContainer: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  cardTitle: { fontSize: 16, top: -12, fontWeight: "500", color: "#1E3A8A" },
  infoIcon: { marginLeft: 8, top: -10 },

  cardTitleContainer2: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  cardTitleToggle: { fontSize: 16, fontWeight: "500", color: "#1E3A8A" },

  emInfoBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(30,58,138,0.25)",
    backgroundColor: "rgba(30,58,138,0.06)",
    marginLeft: "auto",
  },
  importBtnText: { fontSize: 13, fontWeight: "700", color: "#1E3A8A" },

  manualRow: { flexDirection: "row", gap: 10 },

  addMiniBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(30,58,138,0.2)",
    backgroundColor: "rgba(30,58,138,0.06)",
  },
  addMiniText: { fontSize: 14, fontWeight: "700", color: "#1E3A8A" },

  smallLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280", marginBottom: 10, marginTop: 2 },

  emRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "#F8FAFC",
    marginBottom: 10,
  },
  emAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(30,58,138,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  emName: { fontSize: 14.5, fontWeight: "800", color: "#0F172A" },
  emNum: { marginTop: 2, fontSize: 12.5, fontWeight: "700", color: "rgba(15,23,42,0.65)" },
  removeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.18)",
  },

  tipRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  tipText: { fontSize: 12.5, color: "#64748B", fontWeight: "600" },

  registerButton: {
    backgroundColor: "#1E3A8A",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },

  errorText: { color: "#DC2626", marginBottom: 10, fontSize: 14, fontWeight: "600" },
  successText: { color: "#34C759", textAlign: "center", marginBottom: 10, fontSize: 14 },

  loginLink: { color: "#1E3A8A", fontWeight: "bold" },
  loginText: { color: "#555", textAlign: "center", fontSize: 15 },
  loginRedirect: { marginVertical: 20 },
  loader: { marginVertical: 20 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "center", alignItems: "center" },
  modalContainer: { width: "90%", backgroundColor: "#fff", borderRadius: 20, padding: 10, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10 },
  modalContent: { width: "100%", alignItems: "center" },
  modalTitle: { fontSize: 24, fontWeight: "700", color: "#1E3A8A", marginBottom: 12, textAlign: "center" },
  modalSubtitle: { fontSize: 16, color: "#565555", textAlign: "center", marginBottom: 24, lineHeight: 24 },

  otpContainer: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 24 },
  otpInput: { width: 48, height: 48, borderWidth: 2, borderColor: "#e0e0e0", borderRadius: 12, textAlign: "center", fontSize: 20, color: "#061d5c", backgroundColor: "#F9FAFB", fontWeight: "600", paddingVertical: 0, marginHorizontal: 1 },
  otpInputFilled: { borderColor: "#1E3A8A", backgroundColor: "#F0F0F0" },
  submitOtpButton: { backgroundColor: "#1E3A8A", borderRadius: 12, padding: 16, alignItems: "center", width: "100%", marginBottom: 12 },
  submitOtpButtonDisabled: { backgroundColor: "#999" },
  resendButton: { padding: 12, marginBottom: 12 },
  resendButtonDisabled: { opacity: 0.6 },
  resendText: { color: "#1E3A8A", fontSize: 16, fontWeight: "500" },
  cancelButton: { padding: 12 },
  cancelText: { color: "#DC2626", fontSize: 16, fontWeight: "500" },

  infoContent: { marginBottom: 24, paddingHorizontal: 6 },
  infoItem: { fontSize: 15.5, color: "#565555", marginBottom: 8, lineHeight: 23 },
  infoItemor: { fontSize: 15.5, color: "#b33737", marginBottom: 8,marginLeft: 150, lineHeight: 25 },

  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  errorIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#DC2626", marginRight: 10 },
  errorBannerText: { color: "#B91C1C", fontSize: 15, fontWeight: "600", flex: 1, lineHeight: 20 },

  contactModalWrap: { flex: 1, backgroundColor: "#F6F7FB", paddingHorizontal: 16 },
footerText  : { color: '#798085', fontSize: 10, fontWeight: '500' ,display: 'flex', textAlign: 'center', marginBottom: 10, position: 'absolute', bottom: -60, width: '100%'},
  contactModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 12,
    zIndex: 10,
    elevation: 10,
  },
  contactCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  contactModalTitle: { fontSize: 18, fontWeight: "900", color: "#0F172A", maxWidth: "56%", textAlign: "center" },

  addSelectedBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(14,243,136,0.65)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    minWidth: 86,
  },
  addSelectedText: { fontSize: 13, fontWeight: "900", color: "#052E16" },

  contactSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    marginBottom: 10,
  },
  contactSearchInput: { flex: 1, fontSize: 14.5, fontWeight: "800", color: "#0F172A" },

  contactRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  contactRowSelected: {
    borderColor: "rgba(14,243,136,0.55)",
    backgroundColor: "rgba(14,243,136,0.10)",
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(30,58,138,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  contactRowName: { fontSize: 14.5, fontWeight: "900", color: "#0F172A" },
  contactRowNumber: { marginTop: 2, fontSize: 12.5, fontWeight: "700", color: "rgba(15,23,42,0.65)" },

  pickPill: { width: 34, height: 34, borderRadius: 14, backgroundColor: "rgba(14,243,136,0.55)", alignItems: "center", justifyContent: "center" },
  unpickPill: { width: 34, height: 34, borderRadius: 14, borderWidth: 2, borderColor: "rgba(15,23,42,0.12)", backgroundColor: "transparent" },

  emptyBox2: { marginTop: 40, alignItems: "center", justifyContent: "center", gap: 6, padding: 16 },
  emptyTitle2: { fontSize: 15, fontWeight: "900", color: "#0F172A", marginTop: 6 },
  emptySub2: { fontSize: 12.5, fontWeight: "700", color: "rgba(15,23,42,0.65)", textAlign: "center" },
});

export default RegisterScreen;
