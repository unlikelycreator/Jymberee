// import TrackPlayer, {
//   Capability,
//   Event,
//   RepeatMode,
// } from "react-native-track-player";

// import { sendSosAppClosed } from "./voiceSos";
// import { Platform, DeviceEventEmitter } from "react-native";

// /* ------------------ CONFIG ------------------ */
// const DOUBLE_TAP_MS = 800;

// /* ------------------ EARLY NO-OP LISTENERS (stops LogBox spam) ------------------
//    These run immediately on import (before any useEffect).
// */
// try {
//   TrackPlayer.addEventListener(Event.PlaybackState, () => {});
//   TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, () => {});
//   TrackPlayer.addEventListener(Event.PlaybackError, () => {});
// } catch {}

// /* ------------------ STATE ------------------ */
// let setupDone = false;
// let setupPromise: Promise<void> | null = null;

// let uiSubs: Array<{ remove: () => void }> = [];
// let serviceSubs: Array<{ remove: () => void }> = [];

// let lastTapAt = 0;
// let lastSosAt = 0;
// let sending = false;

// /* ------------------ TAP LOGIC ------------------ */
// async function onEarbudTap() {
//   const now = Date.now();

//   // block only if currently sending
//   if (sending) return;

//   // double tap detect
//   if (lastTapAt && now - lastTapAt <= DOUBLE_TAP_MS) {
//     lastTapAt = 0;
//     sending = true;

//     try {
//       DeviceEventEmitter.emit("SOS_SENDING");

//       const ok = await sendSosAppClosed("Earbud SOS: double tap");

//       if (ok) {
//         DeviceEventEmitter.emit("SOS_SENT", {
//           message: "✅ SOS sent successfully",
//         });
//       } else {
//         DeviceEventEmitter.emit("SOS_FAILED");
//       }
//     } catch (e) {
//       DeviceEventEmitter.emit("SOS_FAILED");
//     } finally {
//       sending = false; // ✅ immediately ready for next SOS
//     }

//     return;
//   }

//   lastTapAt = now;
// }

// /* ------------------ INIT ONCE ------------------ */
// export async function initEarbudSystemOnce() {
//   if (setupDone) return;
//   if (setupPromise) return setupPromise;

//   setupPromise = (async () => {
//     try {
//       await TrackPlayer.setupPlayer();

//       await TrackPlayer.updateOptions({
//         capabilities: [
//           Capability.Play,
//           Capability.Pause,
//           Capability.SkipToNext,
//           Capability.SkipToPrevious,
//         ],
//         compactCapabilities: [Capability.Play, Capability.Pause],
//       });

//       await TrackPlayer.reset();

//       // ✅ iOS stability: 2 tracks so Next/Prev stays enabled
//       await TrackPlayer.add([
//         { id: "silent-1", url: "https://example.com/silence.mp3", title: "silent-1", artist: "silent" },
//         { id: "silent-2", url: "https://example.com/silence.mp3", title: "silent-2", artist: "silent" },
//       ]);

//       await TrackPlayer.setRepeatMode(RepeatMode.Queue);

//       // ✅ iOS needs active audio session
//       if (Platform.OS === "ios") {
//         try { await TrackPlayer.setVolume(0); } catch {}
//         try { await TrackPlayer.play(); } catch {}
//       } else {
//         // ✅ Android wake session
//         try { await TrackPlayer.play(); await TrackPlayer.pause(); } catch {}
//       }

//       setupDone = true;
//     } catch (e) {
//       console.log("Earbud init error:", e);
//       setupPromise = null;
//       setupDone = false;
//     }
//   })();

//   return setupPromise;
// }

// /* ------------------ iOS: attach on Dashboard focus ------------------ */
// export async function startEarbudSosListener() {
//   await initEarbudSystemOnce();
//   if (Platform.OS !== "ios") return;

//   stopEarbudSosListener();
//   uiSubs = [
//     TrackPlayer.addEventListener(Event.RemotePlay, onEarbudTap),
//     TrackPlayer.addEventListener(Event.RemotePause, onEarbudTap),
//     TrackPlayer.addEventListener(Event.RemoteNext, onEarbudTap),
//     TrackPlayer.addEventListener(Event.RemotePrevious, onEarbudTap),
//   ];
// }

// export function stopEarbudSosListener() {
//   try {
//     uiSubs.forEach((s) => s?.remove?.());
//   } catch {}
//   uiSubs = [];
//   lastTapAt = 0;
// }

// /* ------------------ Android: playback service ------------------ */
// export const playbackService = async () => {
//   console.log("✅ TrackPlayer playbackService started");

//   await initEarbudSystemOnce();

//   try {
//     serviceSubs.forEach((s) => s?.remove?.());
//   } catch {}
//   serviceSubs = [
//     TrackPlayer.addEventListener(Event.RemotePlay, onEarbudTap),
//     TrackPlayer.addEventListener(Event.RemotePause, onEarbudTap),
//     TrackPlayer.addEventListener(Event.RemoteNext, onEarbudTap),
//     TrackPlayer.addEventListener(Event.RemotePrevious, onEarbudTap),
//   ];
// };