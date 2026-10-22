import { Platform, Alert, PermissionsAndroid } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import {
  getMessaging,
  getToken,
  getAPNSToken,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  onTokenRefresh,
} from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNavigationContainerRef } from '@react-navigation/native';

type RootStackParamList = {
  Map: undefined;
};

const navigationRef = createNavigationContainerRef<RootStackParamList>();

const navigateToScreen = (screenName: keyof RootStackParamList): void => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(screenName);
  } else {
    console.warn('Navigation ref not ready, cannot navigate to', screenName);
    showAlert('Navigation Error', 'Unable to navigate to the requested screen. Please try again.');
  }
};

const showAlert = (
  title: string,
  message: string,
  buttons: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[] = [
    { text: 'OK', style: 'default' },
  ],
): void => {
  Alert.alert(title, message, buttons, { cancelable: true });
};

const storeFCMToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('fcmToken', token);
  } catch (err: unknown) {
    console.error('❌ Error storing FCM token:', err);
    showAlert('Error', 'Failed to store notification token. Please try again.');
  }
};

export async function getFCMToken(): Promise<string | null> {
  try {
    const messagingInstance = getMessaging(getApp());

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Enable Notifications',
          message: 'Allow this app to send you notifications for important updates?',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn('⚠️ Android notification permission denied');
        showAlert('Permission Denied', 'Notifications are disabled. You may not receive updates.');
        return null;
      }
    }

    if (Platform.OS === 'ios') {
      const apnsToken = await getAPNSToken(messagingInstance);
      if (!apnsToken) {
        console.warn(
          '⚠️ No APNs token received. This can happen on simulator or if APNs is not configured.',
        );
      }
    }

    const fcmToken = await getToken(messagingInstance);
    if (!fcmToken) {
      console.warn('⚠️ No FCM token received');
      showAlert('Warning', 'Unable to retrieve notification token. Notifications may not work.');
      return null;
    }

    await storeFCMToken(fcmToken);
    return fcmToken;
  } catch (err: unknown) {
    console.error('❌ Error getting FCM token:', err);
    return null;
  }
}

export function listenForFCMTokenRefresh(callback: (token: string) => void): () => void {
  const messagingInstance = getMessaging(getApp());
  const unsubscribe = onTokenRefresh(messagingInstance, (token: string) => {
    callback(token);
  });
  return unsubscribe;
}

export const registerNotificationListeners = (): (() => void) => {
  const messagingInstance = getMessaging(getApp());

  const unsubscribeOnMessage = onMessage(messagingInstance, async (remoteMessage) => {
    const title =
      remoteMessage.notification?.title ||
      (typeof remoteMessage.data?.title === 'string' ? remoteMessage.data.title : undefined) ||
      'New Notification';

    const body =
      remoteMessage.notification?.body ||
      (typeof remoteMessage.data?.body === 'string' ? remoteMessage.data.body : undefined) ||
      'You have a new message.';

    showAlert(title, body, [
      {
        text: 'View',
        onPress: () => navigateToScreen('Map'),
        style: 'default',
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  });

  const unsubscribeOnOpen = onNotificationOpenedApp(messagingInstance, () => {
    navigateToScreen('Map');
  });

  getInitialNotification(messagingInstance).then((remoteMessage) => {
    if (remoteMessage) {
      setTimeout(() => navigateToScreen('Map'), 500);
    }
  });

  return () => {
    unsubscribeOnMessage();
    unsubscribeOnOpen();
  };
};

export function setNavigationRef(ref: any): void {
  if (ref) {
    navigationRef.current = ref;
  }
}