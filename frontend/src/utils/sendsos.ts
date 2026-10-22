import { launchCamera, ImagePickerResponse } from "react-native-image-picker";
import { PermissionsAndroid, Platform, DeviceEventEmitter } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GetLocation from "react-native-get-location";

import api from "./api";

interface TakePhotoParams {
  description: string;
  showPopup: (title: string, message: string) => void;
}

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

const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: "Camera Permission",
        message: "This app needs camera access to take photos.",
        buttonNeutral: "Ask Me Later",
        buttonNegative: "Cancel",
        buttonPositive: "OK",
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error: unknown) {
    console.error("Permission error:", error);
    return false;
  }
};

const sendNotification = async (
  description: string,
  latitude: number,
  longitude: number
): Promise<ApiResponse> => {
  try {
    const data = await api.post("/notification/send-notification", {
      title: "⚠️ Emergency Alert!",
      latitude,
      longitude,
      description,
      env: "prod", // Live
      // env: "test", // test
    });
    return data;
  } catch (error: any) {
    console.error("Error sending notification:", error);
    throw error;
  }
};

let isLocationBusy = false;
const getCurrentLocation = async (): Promise<LocationData | null> => {
  try {
    if (isLocationBusy) {
      console.log("⏳ Waiting for previous location request...");
      await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    }
    isLocationBusy = true;

    const location = await GetLocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 60000,
    });

    isLocationBusy = false;
    return { latitude: location.latitude, longitude: location.longitude };
  } catch (error: any) {
    isLocationBusy = false;
    console.error("Error fetching location:", error);
    return null;
  }
};

export const takePhotoAndUpload = async ({
  description,
  showPopup,
}: TakePhotoParams): Promise<UploadResponse | null> => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    showPopup("Error", "Camera permission denied");
    DeviceEventEmitter.emit("SOS_FAILED", {
      message: "❌ Camera permission denied",
    });
    return null;
  }

  const location = await getCurrentLocation();
  if (!location) {
    showPopup("Error", "Failed to get location");
    DeviceEventEmitter.emit("SOS_FAILED", {
      message: "❌ Failed to get location",
    });
    return null;
  }

  const { latitude, longitude } = location;

  const options = {
    mediaType: "photo" as const,
    cameraType: "back" as const,
    saveToPhotos: false,
    includeBase64: true,
  };

  return new Promise((resolve, reject) => {
    launchCamera(options, async (response: ImagePickerResponse) => {
      let base64DataUrl = "";

      if (response.didCancel) {
        // user cancelled camera
        return resolve(null);
      } else if (response.errorCode) {
        console.error("Camera error:", response.errorCode, response.errorMessage);
        showPopup("Error", response.errorMessage || "Camera error occurred");
        DeviceEventEmitter.emit("SOS_FAILED", {
          message: "❌ Camera error",
        });
        return reject(new Error(response.errorMessage || "Camera error"));
      } else if (response.assets && response.assets.length > 0) {
        const photo = response.assets[0];
        if (!photo.uri || !photo.base64) {
          showPopup("Error", "Photo data not available");
          DeviceEventEmitter.emit("SOS_FAILED", {
            message: "❌ Photo data not available",
          });
          return reject(new Error("Photo data not available"));
        }
        base64DataUrl = `data:image/jpeg;base64,${photo.base64}`;
      }

      // ✅ start loading now (just before api)
      DeviceEventEmitter.emit("SOS_SENDING", { message: "Sending SOS..." });

      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          showPopup("Error", "Authentication failed. Please log in again.");
          DeviceEventEmitter.emit("SOS_FAILED", {
            message: "❌ Login required",
          });
          return reject(new Error("No token found"));
        }

        const payload = {
          image: base64DataUrl,
          latitude,
          longitude,
          description,
        };

        const uploadResponse = await api.post<UploadResponse>(
          "/images/upload-image",
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (uploadResponse.status === 200) {
          await sendNotification(description, latitude, longitude);

          DeviceEventEmitter.emit("SOS_SENT", {
            message: "✅ SOS sent successfully",
          });

          resolve({ ...uploadResponse.data, imageUploaded: !!base64DataUrl });
        } else {
          DeviceEventEmitter.emit("SOS_FAILED", {
            message: "❌ SOS API failed",
          });
          throw new Error("SOS API failed");
        }
      } catch (error: any) {
        console.error("Error uploading photo:", error.response || error);

        showPopup(
          "Error",
          error.response?.status === 403
            ? "Authentication failed. Please log in again."
            : error.message || "Failed to upload photo"
        );

        DeviceEventEmitter.emit("SOS_FAILED", {
          message:
            error.response?.status === 403
              ? "❌ Authentication failed"
              : "❌ Failed to send SOS",
        });

        reject(error);
      }
    });
  });
};