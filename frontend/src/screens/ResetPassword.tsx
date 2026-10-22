import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from "react-native";

import { Eye, EyeOff, ArrowLeft, Lock } from "lucide-react-native";
import api from "../utils/api";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";

type ProfileResetNavigationProp = StackNavigationProp<RootStackParamList>;

const COLORS = {
  bg: "#F6F7FB",
  surface: "#FFFFFF",
  text: "#0F172A",
  subText: "rgba(15,23,42,0.65)",
  muted: "rgba(15,23,42,0.45)",
  border: "rgba(15,23,42,0.10)",
  primary: "#0EF388",
  primaryText: "#052E16",
  primarySoft: "rgba(14,243,136,0.16)",
  danger: "#ef4444",
  dangerSoft: "rgba(239,68,68,0.10)",
};

const UI = { pad: 16, r: 16, r2: 22 };

const ProfileResetPassword = () => {
  const navigation = useNavigation<ProfileResetNavigationProp>();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const buttonScale = useRef(new Animated.Value(1)).current;

  const isFormValid = useMemo(() => {
    if (!password) return false;
    if (password.length < 6) return false;
    if (password !== confirmPassword) return false;
    return true;
  }, [password, confirmPassword]);

  useEffect(() => {
    // live validation message
    if (!password) {
      setPasswordError("Password is required");
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
    } else if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
    } else {
      setPasswordError(null);
    }
  }, [password, confirmPassword]);

  const handleResetPassword = async () => {
    if (!isFormValid) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post("/auth/reset-password", { password });

      if (response.status === 200 || response.status === 201) {
        const message = response.data?.message || "Password reset successfully";
        setSuccess(message);

        setTimeout(() => navigation.navigate("Profile"), 1200);
      } else {
        setError(response.data?.message || "Failed to reset password");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 20}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate("Profile")}
          activeOpacity={0.85}
        >
          <ArrowLeft color={COLORS.text} size={22} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.iconCircle}>
              <Lock size={18} color={COLORS.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Create a new password</Text>
              <Text style={styles.cardSubtitle}>
                Use at least 6 characters. Keep it safe.
              </Text>
            </View>
          </View>

          {/* New Password */}
          <Text style={styles.label}>New Password</Text>
          <View style={[styles.field, passwordError && !success && styles.fieldError]}>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor={"rgba(15,23,42,0.35)"}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              returnKeyType="next"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((p) => !p)}
              style={styles.eyeBtn}
              activeOpacity={0.85}
            >
              {showPassword ? (
                <EyeOff color={"rgba(15,23,42,0.55)"} size={18} />
              ) : (
                <Eye color={"rgba(15,23,42,0.55)"} size={18} />
              )}
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password</Text>
          <View style={[styles.field, passwordError && !success && styles.fieldError]}>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor={"rgba(15,23,42,0.35)"}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((p) => !p)}
              style={styles.eyeBtn}
              activeOpacity={0.85}
            >
              {showConfirmPassword ? (
                <EyeOff color={"rgba(15,23,42,0.55)"} size={18} />
              ) : (
                <Eye color={"rgba(15,23,42,0.55)"} size={18} />
              )}
            </TouchableOpacity>
          </View>

          {/* Messages */}
          {!!passwordError && !success && (
            <View style={[styles.msg, { backgroundColor: COLORS.dangerSoft, borderColor: "rgba(239,68,68,0.20)" }]}>
              <Text style={[styles.msgText, { color: COLORS.danger }]}>⚠️ {passwordError}</Text>
            </View>
          )}

          {!!error && !passwordError && !success && (
            <View style={[styles.msg, { backgroundColor: COLORS.dangerSoft, borderColor: "rgba(239,68,68,0.20)" }]}>
              <Text style={[styles.msgText, { color: COLORS.danger }]}>⚠️ {error}</Text>
            </View>
          )}

          {!!success && (
            <View style={[styles.msg, { backgroundColor: COLORS.primarySoft, borderColor: "rgba(14,243,136,0.22)" }]}>
              <Text style={[styles.msgText, { color: COLORS.primaryText }]}>✅ {success}</Text>
            </View>
          )}

          {/* Button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 14 }}>
            <TouchableOpacity
              style={[
                styles.btn,
                (loading || !isFormValid) && styles.btnDisabled,
              ]}
              onPress={handleResetPassword}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              disabled={loading || !isFormValid}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.primaryText} />
              ) : (
                <Text style={styles.btnText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    paddingTop: Platform.OS === "android" ? 14 : 54,
    paddingHorizontal: UI.pad,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

  body: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: UI.pad,
    paddingBottom: 12,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: UI.r2,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 4,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
  },

  cardTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  cardSubtitle: { marginTop: 4, fontSize: 12.5, fontWeight: "700", color: COLORS.subText },

  label: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.muted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 10,
    marginBottom: 6,
  },

  field: {
    height: 52,
    borderRadius: UI.r,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },

  fieldError: {
    borderColor: "rgba(239,68,68,0.35)",
    backgroundColor: "rgba(239,68,68,0.05)",
  },

  input: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "800",
    color: COLORS.text,
  },

  eyeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  msg: {
    marginTop: 12,
    padding: 12,
    borderRadius: UI.r,
    borderWidth: 1,
  },

  msgText: {
    fontSize: 12.5,
    fontWeight: "800",
    textAlign: "center",
  },

  btn: {
    height: 50,
    borderRadius: UI.r,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  btnDisabled: {
    opacity: 0.55,
  },

  btnText: {
    fontSize: 14.5,
    fontWeight: "900",
    color: COLORS.primaryText,
  },
});

export default ProfileResetPassword;
