import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { HelpCircle, ShieldAlert, Sparkles } from "lucide-react-native";

const EMERGENCY_PHRASES: Record<string, string> = {
  "help help help": "Urgent SOS",
  "help me": "Urgent SOS",
  "save me": "Urgent SOS",
  "help fire": "For fire situation",
  "help theft": "For Burglary/theft situation",
  "help rape": "For sexual assault situation",
  "help medical": "For medical emergency",
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function VoiceCommandsModal({ visible, onClose }: Props) {
  const items = useMemo(() => Object.entries(EMERGENCY_PHRASES), []);

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Drag handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <ShieldAlert size={18} color="#052e1a" />
              </View>
              <View>
                <Text style={styles.title}>User Manual</Text>
                <Text style={styles.subtitle}>
                  Voice + Shake triggers (instant SOS)
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <View style={styles.tipBadge}>
                <HelpCircle size={14} color="#065F46" />
                <Text style={styles.tipBadgeText}>Help</Text>
              </View>
            </View>
          </View>

          {/* Tips banner */}
          <View style={styles.headerTips}>
            <Sparkles size={14} color="#065F46" />
            <Text style={styles.headerTipsText}>
              Speak clearly • Keep mic permission ON • Short phrases work best
            </Text>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>What happens after SOS</Text>
              <Text style={styles.heroText}>
                When SOS is triggered, the app automatically sends a WhatsApp
                alert with current location to all emergency contacts saved in
                the app, and sends a notification to nearby Jymberee users in
                your current area.
              </Text>
            </View>

            {/* Shake Feature Info */}
            <View style={styles.infoCard}>
              <View style={styles.infoIconWrap}>
                <Text style={styles.infoIcon}>📳</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Shake to Send SOS</Text>
                <Text style={styles.infoDesc}>
                  Shake your phone firmly 2–3 times to trigger SOS instantly.
                  Works even when you can’t speak.
                </Text>
              </View>
            </View>

            {/* SOS Action Info */}
            <View style={styles.infoCard}>
              <View style={styles.infoIconWrap}>
                <Text style={styles.infoIcon}>📣</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Instant Voice SOS</Text>
                <Text style={styles.infoDesc}>
                  Say any phrase below or shake your phone. SOS starts
                  immediately and alerts your trusted contacts + nearby users.
                </Text>
              </View>
            </View>

            {/* Phrases header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available phrases</Text>
              <Text style={styles.sectionHint}>{items.length}</Text>
            </View>

            {/* Phrases list */}
            {items.map(([phrase, desc]) => (
              <View key={phrase} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.phrase} numberOfLines={2}>
                    “{phrase}”
                  </Text>

                  <View style={styles.pill}>
                    <Text style={styles.pillText}>SOS</Text>
                  </View>
                </View>

                {!!desc && (
                  <Text style={styles.desc} numberOfLines={3}>
                    {desc}
                  </Text>
                )}
              </View>
            ))}

            <View style={{ height: 6 }} />
          </ScrollView>

          {/* Bottom */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.9}
              onPress={onClose}
            >
              <Text style={styles.primaryText}>Got it</Text>
            </TouchableOpacity>

            <Text style={styles.bottomNote}>
              Tip: Add emergency contacts in the app for fastest help.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },

  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    paddingBottom: Platform.OS === "ios" ? 18 : 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.16,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -8 },
      },
      android: { elevation: 18 },
    }),
  },

  handleWrap: {
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: "center",
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#86EFAC",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "900", color: "#052e1a" },
  subtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  tipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#86EFAC",
  },
  tipBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#065F46",
  },

  headerTips: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F0FDF4",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#BBF7D0",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTipsText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    color: "#065F46",
  },

  scroll: { maxHeight: 560 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 14, gap: 12 },

  hero: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  heroTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  heroText: { marginTop: 6, fontSize: 13, color: "#374151", lineHeight: 18 },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#86EFAC",
  },
  infoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  infoIcon: { fontSize: 20 },
  infoTitle: { fontSize: 14, fontWeight: "900", color: "#052e1a" },
  infoDesc: {
    marginTop: 2,
    fontSize: 12,
    color: "#374151",
    lineHeight: 16,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  sectionHint: {
    fontSize: 12,
    fontWeight: "900",
    color: "#065F46",
    backgroundColor: "#ECFDF5",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#86EFAC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  card: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  phrase: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    lineHeight: 22,
  },
  pill: {
    backgroundColor: "#FEF2F2",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#FCA5A5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: { color: "#B91C1C", fontWeight: "900", fontSize: 12 },

  desc: { marginTop: 8, fontSize: 13, color: "#4B5563", lineHeight: 18 },

  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: "#052e1a",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "900" },

  bottomNote: {
    textAlign: "center",
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },
});