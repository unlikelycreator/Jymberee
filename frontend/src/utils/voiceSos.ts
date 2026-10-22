import AsyncStorage from "@react-native-async-storage/async-storage";
import GetLocation from "react-native-get-location";
import api from "./api";
import Voice from "@dev-amirzubair/react-native-voice";
import {
  DeviceEventEmitter,
  PermissionsAndroid,
  Platform,
} from "react-native";

/* ================= TYPES ================= */

interface UploadResponse {
  imageUrl?: string;
  [key: string]: any;
}

interface LocationData {
  latitude: number;
  longitude: number;
}

interface ApiResponse<T = any> {
  status: number;
  data: T;
}

/* ================= CONSTANTS ================= */

const EMERGENCY_PHRASES: Record<string, string> = {
  "help help help": "Urgent - immediate help needed",
  "help me": "Urgent - immediate help needed",
  "save me": "Person in immediate danger and needs help",
  "help fire": "Fire emergency",
  "help theft": "Thieves Around",
  "help rape": "Sexual assault - urgent help needed",
  "help medical": "Medical emergency - Please send help",
};

const EMERGENCY_KEYWORDS = Object.keys(EMERGENCY_PHRASES);

const RESTART_DELAY_MS = 900;
const AFTER_SOS_DELAY_MS = 1500;
const SOS_COOLDOWN_MS = 8000;

const MIN_SESSION_MS = 2500;
const SILENCE_RESTART_MS = 1200;
const ERROR_RESTART_MS = 1800;

/* ================= STATE ================= */

let isLocationBusy = false;

let voiceDestroyed = false;
let voiceListening = false;
let isStarting = false;

let sosTriggered = false;
let lastSosAt = 0;

let restartTimer: ReturnType<typeof setTimeout> | null = null;
let listenersAttached = false;

let lastStartAt = 0;
let restartQueued = false;

/* ================= UTILS ================= */

const clearRestartTimer = () => {
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
};

const normalizeSpeech = (raw: string) =>
  raw
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const detectEmergencyPhrase = (speech: string): string | null => {
  const text = normalizeSpeech(speech);

  if (EMERGENCY_PHRASES[text]) return text;

  const matched = EMERGENCY_KEYWORDS.find((k) => text.includes(k));
  return matched || null;
};

const scheduleRestart = (delay = RESTART_DELAY_MS) => {
  if (voiceDestroyed) return;
  if (restartQueued) return;

  const now = Date.now();
  const lived = now - lastStartAt;
  const extra = lived < MIN_SESSION_MS ? MIN_SESSION_MS - lived : 0;

  restartQueued = true;
  clearRestartTimer();

  restartTimer = setTimeout(() => {
    restartQueued = false;
    safeStart();
  }, delay + extra);
};

/* ================= LOCATION ================= */

const getCurrentLocation = async (): Promise<LocationData | null> => {
  try {
    if (isLocationBusy) {
      await new Promise<void>((resolve) => setTimeout(resolve, 1200));
    }

    isLocationBusy = true;

    const location = await GetLocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 60000,
    });

    isLocationBusy = false;

    return { latitude: location.latitude, longitude: location.longitude };
  } catch (e) {
    isLocationBusy = false;
    console.error("Location error:", e);
    return null;
  }
};

/* ================= NOTIFICATION ================= */

const sendNotification = async (
  description: string,
  latitude: number,
  longitude: number
): Promise<ApiResponse> => {
  return api.post("/notification/send-notification", {
    title: "⚠️ Emergency Alert!",
    latitude,
    longitude,
    description,
    env: "prod",
    // env: "test",
  });
};

/* ================= MAIN SOS ================= */

export const sendSosAppClosed = async (description: string): Promise<boolean> => {
  // ✅ global loading start
  DeviceEventEmitter.emit("SOS_SENDING", { message: "Sending SOS..." });

  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      DeviceEventEmitter.emit("SOS_FAILED", { message: "❌ Login required" });
      return false;
    }

    const location = await getCurrentLocation();
    if (!location) {
      DeviceEventEmitter.emit("SOS_FAILED", { message: "❌ Location failed" });
      return false;
    }

    const payload = {
      image: null,
      latitude: location.latitude,
      longitude: location.longitude,
      description,
    };

    const res = await api.post<UploadResponse>("/images/upload-image", payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 200) {
      await sendNotification(description, location.latitude, location.longitude);

      DeviceEventEmitter.emit("SOS_SENT", {
        message: "✅ SOS sent successfully",
      });

      console.log("✅ SOS sent:", description);
      return true;
    }

    DeviceEventEmitter.emit("SOS_FAILED", { message: "❌ SOS API failed" });
    throw new Error("SOS API failed");
  } catch (err) {
    console.log("❌ SOS failed:", err);
    DeviceEventEmitter.emit("SOS_FAILED", { message: "❌ SOS failed" });
    return false;
  }
};

/* ================= 🎤 SAFE START ================= */

const safeStart = async () => {
  if (voiceDestroyed) return;
  if (voiceListening) return;
  if (isStarting) return;

  isStarting = true;

  try {
    try {
      await Voice.stop();
    } catch {}

    await Voice.start("en-US");

    lastStartAt = Date.now();
    voiceListening = true;
  } catch (e) {
    voiceListening = false;
    scheduleRestart(ERROR_RESTART_MS);
  } finally {
    isStarting = false;
  }
};

/* ================= 🎤 PUBLIC START ================= */

export const startVoiceSosListener = async () => {
  if (!voiceDestroyed && (voiceListening || isStarting)) return;

  voiceDestroyed = false;

  if (Platform.OS === "android") {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
  }

  if (!listenersAttached) {
    listenersAttached = true;

    try {
      Voice.removeAllListeners();
    } catch {}

    Voice.onSpeechStart = () => {
      voiceListening = true;
    };

    Voice.onSpeechEnd = () => {
      voiceListening = false;
      if (voiceDestroyed) return;
      if (sosTriggered) return;
      scheduleRestart(SILENCE_RESTART_MS);
    };

    Voice.onSpeechError = () => {
      voiceListening = false;
      if (voiceDestroyed) return;
      if (sosTriggered) return;
      scheduleRestart(ERROR_RESTART_MS);
    };

    Voice.onSpeechResults = async (e: { value?: string[] }) => {
      if (voiceDestroyed) return;

      const now = Date.now();
      if (sosTriggered || now - lastSosAt < SOS_COOLDOWN_MS) return;

      const heard = e.value?.[0] || "";
      const key = detectEmergencyPhrase(heard);
      if (!key) return;

      sosTriggered = true;
      lastSosAt = now;

      try {
        await Voice.stop();
      } catch {}
      try {
        await Voice.cancel();
      } catch {}

      voiceListening = false;

      const desc = EMERGENCY_PHRASES[key];
      const finalDescription = `Voice SOS: ${desc} (heard: "${normalizeSpeech(
        heard
      )}")`;

      const ok = await sendSosAppClosed(finalDescription);

      clearRestartTimer();

      restartTimer = setTimeout(() => {
        sosTriggered = false;
        restartQueued = false;
        if (!voiceDestroyed) safeStart();
      }, ok ? AFTER_SOS_DELAY_MS : 2200);
    };
  }

  await safeStart();
};

/* ================= CLEANUP ================= */

export const stopVoiceSosListener = async () => {
  voiceDestroyed = true;
  voiceListening = false;
  isStarting = false;
  sosTriggered = false;
  lastSosAt = 0;
  restartQueued = false;

  clearRestartTimer();

  try {
    await Voice.stop();
  } catch {}
  try {
    await Voice.cancel();
  } catch {}
  try {
    await Voice.destroy();
  } catch {}
  try {
    Voice.removeAllListeners();
  } catch {}

  listenersAttached = false;
};