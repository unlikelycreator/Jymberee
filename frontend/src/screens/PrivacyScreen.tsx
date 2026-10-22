import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Vibration,
  Linking,
  Animated,
  LayoutAnimation,
  StatusBar,
} from "react-native";
import {
  ArrowLeft,
  Lock,
  Shield,
  Globe,
  FileText,
  ChevronRight,
  ChevronDown,
  X,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  Profile: undefined;
  DeleteAccount: undefined;
};

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
  dangerSoft: "rgba(239,68,68,0.12)",
};

const UI = { pad: 16, r: 16, r2: 22 };

LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

const PrivacyScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // ✅ stable animation
  const buttonScale = useRef(new Animated.Value(1)).current;

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

  const toggleSection = (section: string) => {
    Vibration.vibrate(20);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleExternalLink = async (url: string) => {
    Vibration.vibrate(20);
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Error", "Unable to open this URL");
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Unable to open this URL");
    }
  };

  const Row = ({
    icon,
    title,
    onPress,
    expanded,
    showChevron = true,
    danger = false,
  }: {
    icon: React.ReactNode;
    title: string;
    onPress: () => void;
    expanded?: boolean;
    showChevron?: boolean;
    danger?: boolean;
  }) => {
    return (
      <TouchableOpacity
        style={[
          styles.row,
          danger && { borderColor: "rgba(239,68,68,0.18)", backgroundColor: COLORS.dangerSoft },
        ]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.iconBox, danger && { backgroundColor: "rgba(239,68,68,0.14)" }]}>
            {icon}
          </View>
          <Text style={[styles.rowText, danger && { color: COLORS.danger }]}>{title}</Text>
        </View>

        {showChevron ? (
          expanded ? (
            <ChevronDown size={20} color={"rgba(15,23,42,0.45)"} />
          ) : (
            <ChevronRight size={20} color={"rgba(15,23,42,0.45)"} />
          )
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              Vibration.vibrate(20);
              navigation.goBack();
            }}
            activeOpacity={0.85}
          >
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Account & Privacy</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.subtitle}>Manage your privacy preferences and data</Text>

        {/* CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Privacy Controls</Text>
          <Text style={styles.cardSub}>Tap any section to read details.</Text>

          {/* Data Collection */}
          <Row
            icon={<Lock size={18} color={COLORS.primary} />}
            title="Data Collection"
            expanded={expandedSection === "dataCollection"}
            onPress={() => toggleSection("dataCollection")}
          />
          {expandedSection === "dataCollection" && (
            <Text style={styles.expandText}>
              We collect personal information such as name, email, and location to provide emergency services.
              You can update or delete this data in your profile.
            </Text>
          )}

          {/* Location Sharing */}
          <Row
            icon={<Globe size={18} color={COLORS.primary} />}
            title="Location Sharing"
            expanded={expandedSection === "locationSharing"}
            onPress={() => toggleSection("locationSharing")}
          />
          {expandedSection === "locationSharing" && (
            <Text style={styles.expandText}>
              Location data is shared only during emergencies with authorized services. You can manage preferred
              locations in your profile.
            </Text>
          )}

          {/* Security */}
          <Row
            icon={<Shield size={18} color={COLORS.primary} />}
            title="Data Security"
            expanded={expandedSection === "dataSecurity"}
            onPress={() => toggleSection("dataSecurity")}
          />
          {expandedSection === "dataSecurity" && (
            <Text style={styles.expandText}>
              We use industry-standard security practices and encryption to protect your data from unauthorized
              access.
            </Text>
          )}

          {/* Links */}
          <View style={styles.divider} />

          <Row
            icon={<FileText size={18} color={COLORS.primary} />}
            title="Full Privacy Policy"
            showChevron={true}
            onPress={() =>
              handleExternalLink("https://www.ezeelink.net/jymbereeprivacypolicy.html")
            }
          />

          <Row
            icon={<FileText size={18} color={COLORS.primary} />}
            title="EULA"
            showChevron={true}
            onPress={() => handleExternalLink("https://ezeelink.net/jymberee/eula.html")}
          />
        </View>

        {/* DELETE */}
        <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 12 }}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={() => navigation.navigate("DeleteAccount")}
            activeOpacity={0.9}
          >
            <View style={[styles.iconBox, { backgroundColor: "rgba(239,68,68,0.14)" }]}>
              <X size={18} color={COLORS.danger} />
            </View>
            <Text style={styles.deleteText}>Delete Account</Text>
            <ChevronRight size={20} color={"rgba(15,23,42,0.45)"} />
          </TouchableOpacity>
        </Animated.View>

        {/* NOTE */}
        <View style={styles.note}>
          <Shield size={16} color={COLORS.danger} />
          <Text style={styles.noteText}>
            Your privacy is our priority. Contact support for data requests.
          </Text>
        </View>

        <View style={{ height: 18 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  scroll: {
    paddingHorizontal: UI.pad,
    paddingTop: 18,
    paddingBottom: 22,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
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

  subtitle: {
    textAlign: "center",
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.subText,
    marginBottom: 14,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: UI.r2,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
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

  cardSub: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.subText,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: UI.r,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "#F8FAFC",
    marginBottom: 10,
  },

  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  rowText: {
    fontSize: 14.5,
    fontWeight: "900",
    color: COLORS.text,
  },

  expandText: {
    fontSize: 12.8,
    fontWeight: "700",
    color: COLORS.subText,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 10,
    paddingHorizontal: 6,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(15,23,42,0.08)",
    marginVertical: 6,
  },

  deleteBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: UI.r2,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.20)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },

  deleteText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14.5,
    fontWeight: "900",
    color: COLORS.danger,
  },

  note: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 10,
  },

  noteText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.subText,
    textAlign: "center",
  },
});

export default PrivacyScreen;
