import "react-native-gesture-handler";
import { AppRegistry } from "react-native";
import { Settings } from "react-native-fbsdk-next";
// import TrackPlayer from "react-native-track-player";

import App from "./App";
import { name as jymberee } from "./app.json";
// import { playbackService } from "./src/utils/earbudSos";

// ✅ Required for Android background earbuds events
// TrackPlayer.registerPlaybackService(() => playbackService);
Settings.initializeSDK();
Settings.setAutoLogAppEventsEnabled(true);     // Recommended
Settings.setAdvertiserIDCollectionEnabled(true);
AppRegistry.registerComponent(jymberee, () => App);