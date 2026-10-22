import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Vibration,
  Modal,
  TextInput,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowLeft, Plus, MapPin, Edit2, Trash2, X } from "lucide-react-native";
import api from "../utils/api";
import CountryStateCityPicker from "../components/CountryStateCityPickerLocation";
import { AuthContext } from "../context/AuthContext";

type Location = {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
};

const COLORS = {
  bg: "#F6F7FB",
  surface: "#FFFFFF",
  text: "#0F172A",
  subText: "rgba(15,23,42,0.65)",
  muted: "rgba(15,23,42,0.45)",
  border: "rgba(15,23,42,0.08)",
  primary: "#0EF388",
  primarySoft: "rgba(14,243,136,0.16)",
  danger: "#ef4444",
  dangerSoft: "rgba(239,68,68,0.12)",
};

const UI = { pad: 16, r: 16, r2: 22 };

const LocationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, setUser } = useContext(AuthContext)!;

  const locations: Location[] = useMemo(
    () => user?.preferredLocations || [],
    [user?.preferredLocations]
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [city, setCity] = useState("");

  const resetForm = () => {
    setStreet("");
    setPostalCode("");
    setCountry("");
    setStateVal("");
    setCity("");
  };

  const openAdd = () => {
    Vibration.vibrate(20);
    setEditIndex(null);
    resetForm();
    setModalVisible(true);
  };

  const goBackSafe = () => {
    Vibration.vibrate(20);
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("Dashboard");
  };

  const openEdit = (i: number) => {
    Vibration.vibrate(20);
    const l = locations[i];
    setEditIndex(i);
    setStreet(l.street);
    setPostalCode(l.postalCode);
    setCountry(l.country);
    setStateVal(l.state);
    setCity(l.city);
    setModalVisible(true);
  };

  const saveLocations = async (updated: Location[]) => {
    try {
      const res = await api.put("/auth/update-profile", {
        ...user,
        preferredLocations: updated,
      });

      if (res.status === 200) {
        const u = res.data.user;
        await AsyncStorage.setItem("user", JSON.stringify(u));
        setUser(u);
      }
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.message || "Failed to save");
    }
  };

  const deleteLocation = (i: number) => {
    if (locations.length <= 1) {
      return Alert.alert("Can't delete", "You need at least one location.");
    }

    Alert.alert("Delete Location", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = locations.filter((_, idx) => idx !== i);
          await saveLocations(updated);
          Vibration.vibrate(50);
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!street.trim() || !postalCode.trim() || !country || !stateVal) {
      return Alert.alert("Required", "Please fill all fields.");
    }

    const newLoc: Location = { street, postalCode, country, state: stateVal, city };

    const updated =
      editIndex === null
        ? [...locations, newLoc]
        : locations.map((l, i) => (i === editIndex ? newLoc : l));

    await saveLocations(updated);
    setModalVisible(false);
    Alert.alert("Success", editIndex === null ? "Location added!" : "Location updated!");
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBackSafe} activeOpacity={0.85}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Locations</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>Manage your saved addresses</Text>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {locations.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <MapPin size={26} color={COLORS.text} />
            </View>
            <Text style={styles.emptyTitle}>No locations yet</Text>
            <Text style={styles.emptySub}>
              Add your first location to quickly use it during emergencies.
            </Text>

            <TouchableOpacity style={styles.emptyBtn} onPress={openAdd} activeOpacity={0.9}>
              <Plus size={18} color={"#052E16"} />
              <Text style={styles.emptyBtnText}>Add Location</Text>
            </TouchableOpacity>
          </View>
        ) : (
          locations.map((loc, i) => (
            <TouchableOpacity
              key={`${loc.street}-${i}`}
              activeOpacity={0.9}
              onPress={() => openEdit(i)}
              style={styles.card}
            >
              <View style={styles.cardRow}>
                <View style={styles.pinBubble}>
                  <MapPin size={18} color={COLORS.text} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.street} numberOfLines={1}>
                    {loc.street}
                  </Text>

                  <Text style={styles.secondary} numberOfLines={2}>
                    {[loc.city, loc.state, loc.postalCode].filter(Boolean).join(", ")}
                  </Text>

                  <Text style={styles.country} numberOfLines={1}>
                    {loc.country}
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionChip}
                    onPress={(e) => {
                      e.stopPropagation();
                      openEdit(i);
                    }}
                    activeOpacity={0.9}
                  >
                    <Edit2 size={16} color={COLORS.text} />
                  </TouchableOpacity>

                  {locations.length > 1 && (
                    <TouchableOpacity
                      style={[styles.actionChip, styles.actionChipDanger]}
                      onPress={(e) => {
                        e.stopPropagation();
                        deleteLocation(i);
                      }}
                      activeOpacity={0.9}
                    >
                      <Trash2 size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.9}>
        <View style={styles.fabInner}>
          <Plus size={22} color={"#052E16"} />
        </View>
      </TouchableOpacity>

      {/* ADD / EDIT MODAL */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editIndex === null ? "Add New Location" : "Edit Location"}
              </Text>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
                activeOpacity={0.85}
              >
                <X size={18} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Street Address</Text>
            <View style={styles.field}>
              <MapPin size={18} color={"rgba(15,23,42,0.45)"} />
              <TextInput
                style={styles.input}
                placeholder="House no, Street, Area..."
                placeholderTextColor={"rgba(15,23,42,0.35)"}
                value={street}
                onChangeText={setStreet}
              />
            </View>

            <View style={{ marginTop: 12, marginBottom: 10 }}>
              <CountryStateCityPicker
                country={country}
                state={stateVal}
                city={city}
                onChange={({ country, state, city }) => {
                  setCountry(country);
                  setStateVal(state);
                  setCity(city);
                }}
              />
            </View>

            <Text style={styles.fieldLabel}>Postal Code</Text>
            <View style={styles.field}>
              <Text style={styles.zipPrefix}>ZIP</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 221001"
                placeholderTextColor={"rgba(15,23,42,0.35)"}
                value={postalCode}
                onChangeText={setPostalCode}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.9}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                activeOpacity={0.9}
              >
                <Text style={styles.saveText}>
                  {editIndex === null ? "Add Location" : "Save Changes"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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

  subtitle: {
    textAlign: "center",
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.subText,
    marginBottom: 8,
  },

  scroll: { paddingHorizontal: UI.pad, paddingTop: 8 },

  emptyWrap: {
    marginTop: 60,
    alignItems: "center",
    paddingHorizontal: 14,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
  },

  emptySub: {
    marginTop: 6,
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.subText,
    textAlign: "center",
    lineHeight: 18,
  },

  emptyBtn: {
    marginTop: 14,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
  },

  emptyBtnText: { fontSize: 13.5, fontWeight: "900", color: "#052E16" },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: UI.r2,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },

  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },

  pinBubble: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  street: { fontSize: 14.5, fontWeight: "900", color: COLORS.text },
  secondary: { marginTop: 2, fontSize: 12.5, fontWeight: "700", color: COLORS.subText },
  country: { marginTop: 3, fontSize: 12, fontWeight: "800", color: COLORS.muted },

  cardActions: { flexDirection: "row", gap: 10, marginLeft: 8 },

  actionChip: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  actionChipDanger: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: "rgba(239,68,68,0.18)",
  },

  fab: { position: "absolute", right: 18, bottom: 24 },

  fabInner: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 10,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    padding: 18,
  },

  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: UI.r2,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  modalTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text },

  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.muted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 6,
  },

  field: {
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  zipPrefix: { fontSize: 13, fontWeight: "900", color: "rgba(15,23,42,0.45)" },

  input: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "800",
    color: COLORS.text,
  },

  modalActions: { flexDirection: "row", gap: 10, marginTop: 14 },

  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: { fontSize: 13.5, fontWeight: "900", color: COLORS.text },

  saveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  saveText: { fontSize: 13.5, fontWeight: "900", color: "#052E16" },
});

export default LocationScreen;
