import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  TextInput,
  Alert,
  Platform,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  AppState,
  AppStateStatus,
  ActivityIndicator,
  StatusBar,
  Switch,
  Pressable,
} from "react-native";
import Contacts from "@s77rt/react-native-contacts";
import {
  User,
  Phone,
  Trash2,
  Plus,
  Contact as ContactIcon,
  ArrowLeft,
  CheckCheck,
  Search,
  X,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackNavigationProp } from "@react-navigation/stack";
import { check, request, PERMISSIONS, RESULTS, openSettings } from "react-native-permissions";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PhoneContact {
  name: string;
  number: string;
}

type RootStackParamList = {
  Profile: undefined;
  Home: undefined;
  "safety-tips": undefined;
};

type EmergencyContactsNavigationProp = StackNavigationProp<RootStackParamList>;

interface EmergencyContactsProps {
  navigation: EmergencyContactsNavigationProp;
}

type EmergencyContact = {
  _id: string;
  name: string;
  number: string;
  active?: boolean;
};

const COLORS = {
  bg: "#F6F7FB",
  surface: "#FFFFFF",
  text: "#0F172A",
  subText: "rgba(15,23,42,0.65)",
  muted: "rgba(15,23,42,0.50)",
  border: "rgba(15,23,42,0.08)",

  primary: "#0EF388",
  ink: "#0B1220",

  // disabled card look from screenshot
  disabledOuter: "#D9DDE3",
  disabledInner: "#EEF0F4",
  disabledText: "rgba(15,23,42,0.45)",

  chipGrey: "#E5E7EB",
  chipGreyBorder: "rgba(15,23,42,0.10)",

  danger: "#ef4444",
  dangerSoft: "#FEE2E2",
  dangerBorder: "rgba(239,68,68,0.18)",
};

const UI = { pad: 16, r2: 22 };
const DISABLED_STORE_KEY = "disabled_emergency_contact_ids_v1";

const shadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  android: { elevation: 3 },
  default: {},
});

const btnShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
  default: {},
});

const EmergencyContacts: React.FC<EmergencyContactsProps> = React.memo(({ navigation }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [isLoading, setIsLoading] = useState(false);

  const [phoneContacts, setPhoneContacts] = useState<PhoneContact[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [importSearchQuery, setImportSearchQuery] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<PhoneContact[]>([]);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  const [disabledIds, setDisabledIds] = useState<Record<string, boolean>>({});

  const { emergencyContacts, setEmergencyContacts, user, setUser } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DISABLED_STORE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw || "{}");
        if (parsed && typeof parsed === "object") setDisabledIds(parsed);
      } catch { }
    })();
  }, []);

  const persistDisabledIds = useCallback(async (next: Record<string, boolean>) => {
    setDisabledIds(next);
    try {
      await AsyncStorage.setItem(DISABLED_STORE_KEY, JSON.stringify(next));
    } catch { }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      setAppState(nextState);
      if (nextState === "active" && isModalVisible) fetchPhoneContacts();
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalVisible]);

  const filteredPhoneContacts = useMemo(() => {
    const q = importSearchQuery.trim().toLowerCase();
    if (!q) return phoneContacts;
    return phoneContacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.number.toLowerCase().includes(q)
    );
  }, [phoneContacts, importSearchQuery]);

  const formatPhoneNumber = useCallback((number: string): string => {
    let cleaned = number.replace(/\D/g, "");
    if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
    if (cleaned.startsWith("91") && cleaned.length >= 12) return `+${cleaned}`;
    return cleaned;
  }, []);

  const normalizeNumber = useCallback((num: string) => {
    const cleaned = (num || "").replace(/\s+/g, "").replace(/-/g, "");
    if (!cleaned) return "";
    if (cleaned.startsWith("+")) return cleaned;
    const onlyDigits = cleaned.replace(/\D/g, "");
    if (!onlyDigits) return cleaned;
    if (onlyDigits.startsWith("91") && onlyDigits.length >= 12) return `+${onlyDigits}`;
    if (onlyDigits.length === 10) return `+91${onlyDigits}`;
    return onlyDigits;
  }, []);

  const isContactEnabled = useCallback(
    (c: EmergencyContact) => {
      const localDisabled = !!disabledIds[c._id];
      const backendActive = c.active ?? true;
      return backendActive && !localDisabled;
    },
    [disabledIds]
  );

  const handleCall = useCallback(
    (number: string, blocked?: boolean) => {
      if (blocked) {
        Alert.alert("Contact Disabled", "This contact is disabled. Enable it to call or send alerts.");
        return;
      }
      const fullNumber = number?.startsWith("+") ? number : `${countryCode}${number}`;
      Linking.openURL(`tel:${fullNumber}`).catch(() => {
        Alert.alert("Error", "Unable to make a call. Please try again.");
      });
    },
    [countryCode]
  );

  const handleDelete = useCallback(
    async (id?: string) => {
      if ((emergencyContacts as EmergencyContact[]).length <= 1) {
        Alert.alert("Cannot Delete", "At least one emergency contact is required.");
        return;
      }

      Alert.alert("Delete Contact", "Are you sure you want to delete this contact?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!id) return Alert.alert("Error", "Contact ID not found.");
            try {
              setIsLoading(true);
              const res = await api.delete(`/auth/emergency-contacts/${id}`);
              if (res.status !== 200) {
                Alert.alert("Error", "Failed to delete contact. Please try again later.");
                return;
              }

              const nextDisabled = { ...disabledIds };
              delete nextDisabled[id];
              await persistDisabledIds(nextDisabled);

              setEmergencyContacts(res.data.emergencyContacts);
              setUser({ ...user, emergencyContacts: res.data.emergencyContacts });
              await AsyncStorage.setItem(
                "user",
                JSON.stringify({ ...user, emergencyContacts: res.data.emergencyContacts })
              );
            } catch {
              Alert.alert("Error", "Failed to delete contact.");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]);
    },
    [disabledIds, emergencyContacts, persistDisabledIds, setEmergencyContacts, setUser, user]
  );

  /* ================= PERMISSIONS + IMPORT ================= */

  const requestContactsPermission = useCallback(async (): Promise<boolean> => {
    try {
      let permissionStatus: string;

      if (Platform.OS === "android") {
        permissionStatus = await check(PERMISSIONS.ANDROID.READ_CONTACTS);
        if (permissionStatus === RESULTS.GRANTED) return true;

        if (permissionStatus === RESULTS.DENIED) {
          permissionStatus = await request(PERMISSIONS.ANDROID.READ_CONTACTS);
          return permissionStatus === RESULTS.GRANTED;
        }

        if (permissionStatus === RESULTS.BLOCKED) {
          Alert.alert(
            "Permission Required",
            "Contacts access is required to import emergency contacts. Please enable it in Settings.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => openSettings() },
            ]
          );
          return false;
        }

        if (permissionStatus === RESULTS.UNAVAILABLE) {
          Alert.alert("Contacts Unavailable", "Contacts access is not available on this device.");
          return false;
        }
        return false;
      } else {
        permissionStatus = await check(PERMISSIONS.IOS.CONTACTS);

        if (permissionStatus === RESULTS.GRANTED || permissionStatus === RESULTS.LIMITED) {
          if (permissionStatus === RESULTS.LIMITED) {
            Alert.alert("Limited Access", "You granted limited access. Some contacts may not be available.");
          }
          return true;
        }

        if (permissionStatus === RESULTS.DENIED) {
          permissionStatus = await request(PERMISSIONS.IOS.CONTACTS);
          return permissionStatus === RESULTS.GRANTED || permissionStatus === RESULTS.LIMITED;
        }

        if (permissionStatus === RESULTS.BLOCKED) {
          Alert.alert(
            "Permission Blocked",
            "Contacts access is required to import emergency contacts. Please enable it in Settings.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => openSettings() },
            ]
          );
          return false;
        }

        if (permissionStatus === RESULTS.UNAVAILABLE) {
          Alert.alert("Contacts Unavailable", "Contacts access is not available on this device.");
          return false;
        }

        return false;
      }
    } catch {
      Alert.alert("Error", "Failed to request contacts permission.");
      return false;
    }
  }, []);

  const fetchPhoneContacts = useCallback(async () => {
    setIsLoading(true);

    const hasPermission = await requestContactsPermission();
    if (!hasPermission) {
      Alert.alert("Permission Denied", "Cannot access contacts without permission.");
      setIsLoading(false);
      return;
    }

    try {
      const list = await Contacts.getAll(["firstName", "lastName", "phoneNumbers"]);

      const formatted: PhoneContact[] = list
        .map((c: any) => {
          const first = (c.firstName || "").trim();
          const last = (c.lastName || "").trim();
          const name = `${first} ${last}`.trim() || "Unknown";
          const number = c.phoneNumbers?.[0]?.value?.replace(/[\s-]/g, "") || "";
          return number ? { name, number } : null;
        })
        .filter(Boolean) as PhoneContact[];

      setPhoneContacts(formatted);
      setSelectedContacts([]);
      setImportSearchQuery("");
      setModalVisible(true);
    } catch {
      Alert.alert("Error", "Failed to fetch contacts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [requestContactsPermission]);

  const toggleContactSelection = useCallback((contact: PhoneContact) => {
    setSelectedContacts((prev) =>
      prev.some((c) => c.number === contact.number)
        ? prev.filter((c) => c.number !== contact.number)
        : [...prev, contact]
    );
  }, []);

  const addMultipleContacts = useCallback(async () => {
    if (selectedContacts.length === 0) {
      Alert.alert("No Selection", "Please select at least one contact to add.");
      return;
    }

    try {
      setIsLoading(true);
      let updated = [...(emergencyContacts as EmergencyContact[])];

      for (const contact of selectedContacts) {
        const fullNumber = contact.number.startsWith("+")
          ? contact.number
          : `${countryCode}${formatPhoneNumber(contact.number)}`;

        const exists = (updated as EmergencyContact[]).some(
          (c) => normalizeNumber(c.number) === normalizeNumber(fullNumber)
        );
        if (exists) continue;

        const response = await api.put("/auth/emergency-contacts", {
          name: contact.name,
          number: fullNumber,
        });

        if (response.status === 200) updated = response.data.emergencyContacts;
      }

      setEmergencyContacts(updated);
      setUser({ ...user, emergencyContacts: updated });
      await AsyncStorage.setItem("user", JSON.stringify({ ...user, emergencyContacts: updated }));

      setModalVisible(false);
      setSelectedContacts([]);
      Alert.alert("Success", `${selectedContacts.length} contact(s) added successfully.`);
    } catch {
      Alert.alert("Error", "Some contacts could not be added. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedContacts,
    emergencyContacts,
    setEmergencyContacts,
    setUser,
    user,
    countryCode,
    formatPhoneNumber,
    normalizeNumber,
  ]);

  const addContactManually = useCallback(async () => {
    if (!newName.trim() || !newNumber.trim()) {
      Alert.alert("Invalid Input", "Please enter both name and phone number.");
      return;
    }

    const fullNumber = newNumber.startsWith("+") ? newNumber : `${countryCode}${formatPhoneNumber(newNumber)}`;

    if (!/^\+[1-9]\d{9,14}$/.test(fullNumber)) {
      Alert.alert("Invalid Input", "Please enter a valid phone number with country code (e.g., +919876543210).");
      return;
    }

    const exists = (emergencyContacts as EmergencyContact[]).some(
      (c) => normalizeNumber(c.number) === normalizeNumber(fullNumber)
    );
    if (exists) {
      Alert.alert("Duplicate Contact", "This phone number is already added.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.put("/auth/emergency-contacts", { name: newName, number: fullNumber });
      if (response.status !== 200) throw new Error("Failed to add contact");

      setEmergencyContacts(response.data.emergencyContacts);
      setUser({ ...user, emergencyContacts: response.data.emergencyContacts });
      await AsyncStorage.setItem(
        "user",
        JSON.stringify({ ...user, emergencyContacts: response.data.emergencyContacts })
      );

      setNewName("");
      setNewNumber("");
      setCountryCode("+91");
      setIsAdding(false);

      Alert.alert("Success", "Contact added successfully.");
    } catch (error: any) {
      Alert.alert("Error", `Failed to add contact: ${error?.response?.data?.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  }, [
    newName,
    newNumber,
    countryCode,
    emergencyContacts,
    setEmergencyContacts,
    setUser,
    user,
    formatPhoneNumber,
    normalizeNumber,
  ]);

  /* ================= ✅ TOGGLE ACTIVE (BACKEND) ================= */

  const toggleEnabled = useCallback(
    async (contact: EmergencyContact) => {
      if (!contact?._id) return;

      const all = (emergencyContacts as EmergencyContact[]) || [];
      const currentlyEnabled = isContactEnabled(contact);
      const nextActive = !currentlyEnabled;

      const enabledCount = all.filter((c) => isContactEnabled(c)).length;
      if (!nextActive && enabledCount <= 1) {
        Alert.alert("Not Allowed", "At least one emergency contact must stay enabled.");
        return;
      }

      const optimistic = all.map((c) => (c._id === contact._id ? { ...c, active: nextActive } : c));

      setEmergencyContacts(optimistic);
      setUser({ ...user, emergencyContacts: optimistic });
      await AsyncStorage.setItem("user", JSON.stringify({ ...user, emergencyContacts: optimistic }));

      try {
        const res = await api.patch("/auth/emergency-contacts/toggle", {
          contactId: contact._id,
          active: nextActive,
        });

        const updated: EmergencyContact[] = res?.data?.emergencyContacts ?? optimistic;

        const nextDisabled = { ...disabledIds };
        delete nextDisabled[contact._id];
        await persistDisabledIds(nextDisabled);

        setEmergencyContacts(updated);
        setUser({ ...user, emergencyContacts: updated });
        await AsyncStorage.setItem("user", JSON.stringify({ ...user, emergencyContacts: updated }));
      } catch (e: any) {
        setEmergencyContacts(all);
        setUser({ ...user, emergencyContacts: all });
        await AsyncStorage.setItem("user", JSON.stringify({ ...user, emergencyContacts: all }));
        Alert.alert("Error", e?.response?.data?.message || "Failed to update contact status.");
      }
    },
    [disabledIds, emergencyContacts, isContactEnabled, persistDisabledIds, setEmergencyContacts, setUser, user]
  );

  const handleImportMoreInModal = useCallback(() => {
    Alert.alert(
      "Get Full Access",
      'To see all contacts, go to Settings → [Your App] → Contacts → tap "Add All Contacts"',
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => openSettings().catch(() => { }) },
      ]
    );
  }, []);

  const savedNumbersNormalized = useMemo(() => {
    const arr = (emergencyContacts as EmergencyContact[]).map((c) => normalizeNumber(c.number));
    return new Set(arr);
  }, [emergencyContacts, normalizeNumber]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate("Profile")} activeOpacity={0.85}>
          <ArrowLeft color={COLORS.text} size={22} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subHeader}>At least one contact is required</Text>

      <ScrollView contentContainerStyle={styles.innerContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* ACTIONS */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => setIsAdding(true)}
            disabled={isLoading}
            android_ripple={{ color: "rgba(0,0,0,0.06)" }}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnGreen,
              pressed && Platform.OS === "ios" ? { opacity: 0.9 } : null,
              isLoading ? { opacity: 0.75 } : null,
            ]}
          >
            <Plus size={18} color={"#052E16"} />
            <Text style={styles.actionTextGreen}>Add Manually</Text>
          </Pressable>

          <Pressable
            onPress={fetchPhoneContacts}
            disabled={isLoading}
            android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnDark,
              pressed && Platform.OS === "ios" ? { opacity: 0.9 } : null,
              isLoading ? { opacity: 0.75 } : null,
            ]}
          >
            <ContactIcon size={18} color={"#FFFFFF"} />
            <Text style={styles.actionTextDark}>{isLoading ? "Loading..." : "Phonebook"}</Text>
          </Pressable>
        </View>

        {/* MANUAL FORM */}
        {isAdding && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add new contact</Text>

            <View style={styles.field}>
              <View style={styles.iconBox}>
                <User size={18} color={COLORS.primary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={newName}
                onChangeText={setNewName}
                placeholderTextColor={"rgba(15,23,42,0.35)"}
              />
            </View>

            <View style={styles.phoneRow}>
              <TextInput
                style={styles.codeInput}
                value={countryCode}
                onChangeText={setCountryCode}
                keyboardType="phone-pad"
                placeholder="+91"
                placeholderTextColor={"rgba(15,23,42,0.35)"}
                maxLength={6}
              />

              <View style={[styles.field, { flex: 1, marginBottom: 0 }]}>
                <View style={styles.iconBox}>
                  <Phone size={18} color={COLORS.primary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Phone number"
                  value={newNumber}
                  onChangeText={setNewNumber}
                  keyboardType="phone-pad"
                  placeholderTextColor={"rgba(15,23,42,0.35)"}
                />
              </View>
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity style={[styles.saveBtn, isLoading && { opacity: 0.7 }]} onPress={addContactManually} disabled={isLoading} activeOpacity={0.9}>
                <Text style={styles.saveBtnText}>{isLoading ? "Adding..." : "Add Contact"}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsAdding(false)} disabled={isLoading} activeOpacity={0.9}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>YOUR CONTACTS</Text>

        {(emergencyContacts as EmergencyContact[]).length > 0 ? (
          (emergencyContacts as EmergencyContact[]).map((contact) => {
            const enabled = isContactEnabled(contact);

            // ✅ EXACT screenshot-style disabled card
            if (!enabled) {
              return (
                <View key={contact._id} >
                  <View style={styles.disabledInnerCard}>
                    <View style={styles.disabledInnerRow}>
                      <View style={styles.avatarMint}>
                        <User size={18} color={"rgba(15,23,42,0.55)"} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.disabledName} numberOfLines={1}>{contact.name}</Text>
                        <Text style={styles.disabledNumber} numberOfLines={1}>{contact.number}</Text>
                      </View>

                      {/* Right controls (match screenshot) */}
                      <View style={styles.rightStack}>

                        <Switch
                          value={false}
                          onValueChange={() => toggleEnabled(contact)}
                          trackColor={{ false: "rgba(15,23,42,0.18)", true: "rgba(14,243,136,0.45)" }}
                          thumbColor={"#E5E7EB"}
                          ios_backgroundColor={"rgba(15,23,42,0.18)"}
                        />
                      </View>

                      <View style={styles.iconStack}>
                        <View style={styles.callGreyChip}>
                          <Phone size={16} color={"rgba(15,23,42,0.35)"} />
                        </View>

                        <Pressable
                          onPress={() => handleDelete(contact._id)}
                          disabled={(emergencyContacts as EmergencyContact[]).length <= 1 || isLoading}
                          android_ripple={{ color: "rgba(0,0,0,0.06)" }}
                          style={({ pressed }) => [
                            styles.deleteRedChip,
                            pressed && Platform.OS === "ios" ? { opacity: 0.9 } : null,
                            (emergencyContacts as EmergencyContact[]).length <= 1 ? { opacity: 0.55 } : null,
                          ]}
                        >
                          <Trash2 size={16} color={COLORS.danger} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              );
            }

            // ✅ ENABLED CARD (white, like screenshot)
            return (
              <View key={contact._id} style={[styles.enabledCard, shadow]}>
                <Pressable
                  onPress={() => handleCall(contact.number, false)}
                  android_ripple={{ color: "rgba(0,0,0,0.05)" }}
                  style={styles.enabledLeft}
                >
                  <View style={styles.avatarMint}>
                    <User size={18} color={"rgba(15,23,42,0.75)"} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.enabledName} numberOfLines={1}>{contact.name}</Text>
                    <Text style={styles.enabledNumber} numberOfLines={1}>{contact.number}</Text>
                  </View>
                </Pressable>

                <View style={styles.enabledRight}>
                  <View style={styles.rightStack}>

                    <Switch
                      value={true}
                      onValueChange={() => toggleEnabled(contact)}
                      trackColor={{ false: "rgba(15,23,42,0.18)", true: "rgba(14,243,136,0.45)" }}
                      thumbColor={COLORS.primary}
                      ios_backgroundColor={"rgba(15,23,42,0.18)"}
                    />
                  </View>

                  <Pressable
                    onPress={() => handleCall(contact.number, false)}
                    android_ripple={{ color: "rgba(0,0,0,0.08)" }}
                    style={styles.callGreenChip}
                  >
                    <Phone size={16} color={"#052E16"} />
                  </Pressable>

                  <Pressable
                    onPress={() => handleDelete(contact._id)}
                    disabled={(emergencyContacts as EmergencyContact[]).length <= 1 || isLoading}
                    android_ripple={{ color: "rgba(0,0,0,0.06)" }}
                    style={[
                      styles.deleteRedChip,
                      (emergencyContacts as EmergencyContact[]).length <= 1 && { opacity: 0.55 },
                    ]}
                  >
                    <Trash2 size={16} color={COLORS.danger} />
                  </Pressable>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No emergency contacts yet</Text>
            <Text style={styles.emptySub}>Please add at least one contact</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Please wait...</Text>
        </View>
      )}

      {/* IMPORT MODAL */}
      <Modal visible={isModalVisible} animationType="slide" transparent={false}>
        <View style={[styles.modalWrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

          <View style={styles.modalHeaderRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setModalVisible(false)} activeOpacity={0.85}>
              <X size={20} color={COLORS.text} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Select Contacts</Text>

            <TouchableOpacity
              style={[styles.modalAddChip, selectedContacts.length === 0 && { opacity: 0.5 }]}
              onPress={addMultipleContacts}
              disabled={selectedContacts.length === 0 || isLoading}
              activeOpacity={0.9}
            >
              <Text style={styles.modalAddChipText}>Add ({selectedContacts.length})</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Search size={18} color={"rgba(15,23,42,0.45)"} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              value={importSearchQuery}
              onChangeText={setImportSearchQuery}
              placeholderTextColor={"rgba(15,23,42,0.35)"}
            />
          </View>

          <FlatList
            data={filteredPhoneContacts}
            keyExtractor={(item, index) => `${item.number}-${index}`}
            contentContainerStyle={{ paddingBottom: 14 }}
            renderItem={({ item }) => {
              const normalized = normalizeNumber(item.number);
              const alreadyAdded = savedNumbersNormalized.has(normalized);
              const selected = selectedContacts.some((c) => c.number === item.number);

              return (
                <Pressable
                  onPress={() => {
                    if (alreadyAdded) {
                      Alert.alert("Already Added", "This contact is already in your emergency contacts list.");
                      return;
                    }
                    toggleContactSelection(item);
                  }}
                  android_ripple={{ color: "rgba(0,0,0,0.06)" }}
                  style={[
                    styles.importRow,
                    selected && styles.importRowSelected,
                    alreadyAdded && styles.importRowAlreadyAdded,
                  ]}
                >
                  <View style={styles.importAvatar}>
                    <User size={16} color={COLORS.text} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.importName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.importNumber} numberOfLines={1}>{item.number}</Text>

                    {alreadyAdded && <Text style={styles.alreadyAddedText}>Already in emergency contacts</Text>}
                  </View>

                  {alreadyAdded ? (
                    <View style={styles.addedPill}><Text style={styles.addedPillText}>Added</Text></View>
                  ) : selected ? (
                    <View style={styles.checkPill}><CheckCheck size={18} color={COLORS.text} /></View>
                  ) : (
                    <View style={styles.uncheckPill} />
                  )}
                </Pressable>
              );
            }}
          />

          {Platform.OS === "ios" && (
            <TouchableOpacity style={styles.importMoreBtn} onPress={handleImportMoreInModal} disabled={isLoading} activeOpacity={0.9}>
              <ContactIcon size={18} color={COLORS.text} />
              <Text style={styles.importMoreText}>Import More Contacts</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: UI.pad },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: -30, marginBottom: 10 },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center", ...btnShadow,
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text },

  subHeader: { textAlign: "center", fontSize: 12.5, fontWeight: "700", color: COLORS.subText, marginBottom: 14 },
  innerContainer: { padding: 5, paddingBottom: 30 },

  actionsRow: { flexDirection: "row", marginBottom: 14 },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    ...btnShadow,
  },
  actionBtnGreen: { backgroundColor: COLORS.primary, marginRight: 10 },
  actionBtnDark: { backgroundColor: COLORS.ink },

  actionTextGreen: { marginLeft: 8, fontSize: 13.5, fontWeight: "900", color: "#052E16" },
  actionTextDark: { marginLeft: 8, fontSize: 13.5, fontWeight: "900", color: "#FFFFFF" },

  formCard: { backgroundColor: COLORS.surface, borderRadius: UI.r2, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 14, ...shadow },
  formTitle: { fontSize: 14.5, fontWeight: "900", color: COLORS.text, marginBottom: 10 },

  field: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, height: 52, borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "#F8FAFC",
    marginBottom: 10,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 14,
    backgroundColor: "rgba(14,243,136,0.16)",
    alignItems: "center", justifyContent: "center",
    marginRight: 10,
  },
  input: { flex: 1, fontSize: 14.5, fontWeight: "800", color: COLORS.text },

  phoneRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  codeInput: {
    width: 86, height: 52, borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    fontSize: 14.5, fontWeight: "900", color: COLORS.text,
    marginRight: 10,
  },

  formButtons: { flexDirection: "row" },
  saveBtn: { flex: 1, height: 46, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginRight: 10 },
  saveBtnText: { fontSize: 13.5, fontWeight: "900", color: "#052E16" },
  cancelBtn: { flex: 1, height: 46, borderRadius: 16, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "rgba(15,23,42,0.10)", alignItems: "center", justifyContent: "center" },
  cancelBtnText: { fontSize: 13.5, fontWeight: "900", color: COLORS.text },

  sectionLabel: { marginTop: 6, marginBottom: 10, fontSize: 12, fontWeight: "900", color: COLORS.muted, letterSpacing: 0.8 },

  // ✅ Enabled Card (white)
  enabledCard: {
    backgroundColor: COLORS.surface,
    borderRadius: UI.r2,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  enabledLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  enabledRight: { flexDirection: "row", alignItems: "center", marginLeft: 10 },

  // ✅ Disabled Card (grey outer + inner row like screenshot)

  disabledInnerCard: {
    backgroundColor: COLORS.disabledInner,
    borderRadius: UI.r2,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  disabledInnerRow: { flexDirection: "row", alignItems: "center" },

  avatarMint: {
    width: 42, height: 42, borderRadius: 16,
    backgroundColor: "rgba(14,243,136,0.16)",
    alignItems: "center", justifyContent: "center",
    marginRight: 12,
  },

  enabledName: { fontSize: 14.5, fontWeight: "900", color: COLORS.text },
  enabledNumber: { marginTop: 2, fontSize: 12.5, fontWeight: "700", color: COLORS.subText },

  disabledName: { fontSize: 14.5, fontWeight: "900", color: "rgba(15,23,42,0.45)" },
  disabledNumber: { marginTop: 2, fontSize: 12.5, fontWeight: "700", color: "rgba(15,23,42,0.35)" },
  disabledHint: { marginTop: 6, fontSize: 11.5, fontWeight: "800", color: "rgba(15,23,42,0.45)", lineHeight: 14 },

  rightStack: { alignItems: "center", justifyContent: "center", marginLeft: 10, marginRight: 10 },
  onText: { fontSize: 10.5, fontWeight: "900", color: "rgba(15,23,42,0.70)", marginBottom: 2 },
  offText: { fontSize: 10.5, fontWeight: "900", color: "rgba(15,23,42,0.45)", marginBottom: 2 },

  iconStack: { flexDirection: "row", alignItems: "center" },

  callGreenChip: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  callGreyChip: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: COLORS.chipGrey,
    borderWidth: 1,
    borderColor: COLORS.chipGreyBorder,
    alignItems: "center", justifyContent: "center",
    marginRight: 10,
  },
  deleteRedChip: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },

  emptyBox: { marginTop: 40, alignItems: "center", justifyContent: "center", padding: 16 },
  emptyTitle: { fontSize: 15, fontWeight: "900", color: COLORS.text },
  emptySub: { fontSize: 12.5, fontWeight: "700", color: COLORS.subText, marginTop: 6, textAlign: "center" },

  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,255,255,0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  loadingText: { fontSize: 13, fontWeight: "800", color: COLORS.subText, marginTop: 10 },

  // modal
  modalWrap: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: UI.pad },
  modalHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text },

  modalAddChip: { height: 40, paddingHorizontal: 14, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  modalAddChipText: { fontSize: 13, fontWeight: "900", color: "#052E16" },

  searchBar: {
    flexDirection: "row", alignItems: "center",
    height: 48, paddingHorizontal: 12,
    borderRadius: 16, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14.5, fontWeight: "800", color: COLORS.text, marginLeft: 10 },

  importRow: {
    backgroundColor: COLORS.surface,
    borderRadius: UI.r2,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  importRowSelected: { borderColor: "rgba(14,243,136,0.55)", backgroundColor: "rgba(14,243,136,0.10)" },
  importRowAlreadyAdded: { opacity: 0.6 },

  importAvatar: {
    width: 36, height: 36, borderRadius: 14,
    backgroundColor: "rgba(14,243,136,0.16)",
    alignItems: "center", justifyContent: "center",
    marginRight: 12,
  },
  importName: { fontSize: 14.5, fontWeight: "900", color: COLORS.text },
  importNumber: { marginTop: 2, fontSize: 12.5, fontWeight: "700", color: COLORS.subText },
  alreadyAddedText: { marginTop: 6, fontSize: 11.5, fontWeight: "800", color: "rgba(15,23,42,0.55)" },

  addedPill: { height: 30, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: "rgba(15,23,42,0.10)", backgroundColor: "rgba(15,23,42,0.06)", alignItems: "center", justifyContent: "center", marginLeft: 10 },
  addedPillText: { fontSize: 11.5, fontWeight: "900", color: "rgba(15,23,42,0.70)" },

  checkPill: { width: 34, height: 34, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginLeft: 10 },
  uncheckPill: { width: 34, height: 34, borderRadius: 14, borderWidth: 2, borderColor: "rgba(15,23,42,0.12)", backgroundColor: "transparent", marginLeft: 10 },

  importMoreBtn: { height: 48, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: "rgba(15,23,42,0.12)", alignItems: "center", justifyContent: "center", flexDirection: "row", marginTop: 6, marginBottom: 12 },
  importMoreText: { fontSize: 13.5, fontWeight: "900", color: COLORS.text, marginLeft: 10 },
});

export default EmergencyContacts;
