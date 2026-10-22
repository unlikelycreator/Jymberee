import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent, GestureHandlerRootView } from 'react-native-gesture-handler'; 
import { Trash } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

interface NotificationData {
  _id: string;
  title: string;
  message: string;
  latitude: string;
  longitude: string;
  senderId: {
    _id: string;
    name: string;
    profilePicture: string;
  };
  sos: any[];
  mark_as_read: number;
  createdAt: string;
}

interface NotificationProps {
  visible: boolean;
  onClose: () => void;
  onNotificationsChange: (hasUnseen: boolean) => void;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

const Notification: React.FC<NotificationProps> = ({
  visible,
  onClose,
  onNotificationsChange,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const notificationSlideAnims = useRef<{ [key: string]: Animated.Value }>({}).current;
  const notificationPollRef = useRef<number | null>(null);


  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          console.log('Token not found')
          return
        }
        const response = await api.get('/notification/get-notifications', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response && response.data.success) {
          setNotifications(response.data.notifications || []);
          const hasUnseen = response.data.notifications.some(
            (n: NotificationData) => n.mark_as_read === 0,
          );
          onNotificationsChange(hasUnseen);
        } else {
          console.log('Invalid response from server');
        }
      } catch (error) {
        console.log('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
    return () => {
      if (notificationPollRef.current) {
        clearInterval(notificationPollRef.current);
      }
    };
  }, [onNotificationsChange]);

  useEffect(() => {
    notifications.forEach((notification) => {
      if (!notificationSlideAnims[notification._id]) {
        notificationSlideAnims[notification._id] = new Animated.Value(0);
      }
    });
  }, [notifications]);

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found. Please log in.');
      }
      await api.patch(
        `/notification/mark-as-read/${notificationId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, mark_as_read: 1 } : n,
        ),
      );
      onNotificationsChange(
        notifications.some((n) => n._id !== notificationId && n.mark_as_read === 0),
      );
    } catch (error) {
      console.log('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found. Please log in.');
      }
      await api.delete(`/notification/delete-notification/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      delete notificationSlideAnims[notificationId];
      onNotificationsChange(
        notifications
          .filter((n) => n._id !== notificationId)
          .some((n) => n.mark_as_read === 0),
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found. Please log in.');
      }
      await api.delete('/notification/delete-all-notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([]);
      onNotificationsChange(false);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      Alert.alert('Error', 'Failed to delete all notifications.');
    }
  };


  const onPanGestureEvent = (notificationId: string, event: PanGestureHandlerGestureEvent) => {
    const translateX = Math.max(-width * 0.3, Math.min(width * 0.3, event.nativeEvent.translationX));
    notificationSlideAnims[notificationId].setValue(translateX);
  };

  const onPanHandlerStateChange = (notificationId: string, event: PanGestureHandlerGestureEvent) => {
    const swipeThreshold = width * 0.25;
    const dx = event.nativeEvent.translationX;

    if (Math.abs(dx) > swipeThreshold) {
      Animated.timing(notificationSlideAnims[notificationId], {
        toValue: dx < 0 ? -width : width,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        deleteNotification(notificationId);
      });
    } else {
      Animated.spring(notificationSlideAnims[notificationId], {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid timestamp');
      }
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.log('Error formatting timestamp:', error);
      return 'Invalid date';
    }
  };

  const handleNotificationPress = async (notification: NotificationData) => {
    try {
      await markNotificationAsRead(notification._id);
      navigation.navigate('Map');
      onClose();
    } catch (error) {
      console.log('Error in handleNotificationPress:', error);
      Alert.alert('Error', 'Failed to process notification. Please try again.');
    }
  };

  

  const closeFullScreenImage = () => {
    setFullScreenImage(null);
  };

  return (
    <>
      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
        supportedOrientations={['portrait', 'landscape']}
      >
        <View style={styles.modalOverlay}>
          <GestureHandlerRootView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <View style={styles.modalHeaderButtons}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading notifications...</Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.notificationList}
                nestedScrollEnabled={true} 
              >
                {notifications.length === 0 ? (
                  <Text style={styles.noNotificationsText}>
                    No notifications available
                  </Text>
                ) : (
                  notifications.map((notification) => (
                    <PanGestureHandler
                      key={notification._id}
                      onGestureEvent={(event) => onPanGestureEvent(notification._id, event)}
                      onHandlerStateChange={(event) => onPanHandlerStateChange(notification._id, event)}
                      shouldCancelWhenOutside={false} 
                    >
                      <View style={styles.notificationContainer}>
                        <Animated.View
                          style={[
                            styles.deleteBackground,
                            {
                              opacity: notificationSlideAnims[notification._id]
                                ? notificationSlideAnims[notification._id].interpolate({
                                    inputRange: [-width * 0.3, 0, width * 0.3],
                                    outputRange: [1, 0, 1],
                                  })
                                : 0,
                            },
                          ]}
                        >
                          <View style={styles.deleteBackgroundContent}>
                            <Trash size={24} color="#FFF" />
                            <Text style={styles.deleteBackgroundText}>Delete</Text>
                          </View>
                          <View style={styles.deleteBackgroundContent}>
                            <Text style={styles.deleteBackgroundText}>Delete</Text>
                            <Trash size={24} color="#FFF" />
                          </View>
                        </Animated.View>
                        <Animated.View
                          style={[
                            styles.notificationItem,
                            {
                              transform: [{ translateX: notificationSlideAnims[notification._id] || 0 }],
                              backgroundColor: notification.mark_as_read === 0 ? '#e0f7fa' : '#F9FAFB',
                            },
                          ]}
                        >
                          <TouchableOpacity
                            onPress={() => handleNotificationPress(notification)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.notificationHeader}>
                              {notification.senderId?.profilePicture && (
                                <TouchableOpacity
                                  
                                >
                                  <Image
                                    source={{ uri: notification.senderId.profilePicture }}
                                    style={styles.notificationProfileImage}
                                    defaultSource={require('../assets/images/pin-map.png')}
                                    onError={(e) => console.error('Notification image error:', e.nativeEvent.error)}
                                  />
                                </TouchableOpacity>
                              )}
                              <View style={styles.notificationHeaderText}>
                                <Text
                                  style={[
                                    styles.notificationTitle,
                                    notification.mark_as_read === 0 && { fontWeight: '700' },
                                  ]}
                                >
                                  {notification.title || 'No Title'}
                                </Text>
                                <Text style={styles.notificationSender}>
                                  From: {notification.senderId?.name || 'Unknown User'}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.notificationMessage}>
                              {notification.message || 'No message available'}
                            </Text>
                            <Text style={styles.notificationTimestamp}>
                              {formatTimestamp(notification.createdAt)}
                            </Text>
                            {notification && notification.sos.length > 0 && (
                              <Text style={styles.notificationSos}>
                                SOS Location: Lat: {notification.latitude}, Long: {notification.longitude}
                              </Text>
                            )}
                          </TouchableOpacity>
                        </Animated.View>
                      </View>
                    </PanGestureHandler>
                  ))
                )}
                {notifications.length > 0 && (
                  <View style={styles.clearButtonContainer}>
                    <TouchableOpacity
                      onPress={deleteAllNotifications}
                      style={styles.clearButton}
                    >
                      <Trash size={20} color="gray" />
                      <Text style={styles.clearAllText}>Clear All</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </GestureHandlerRootView>
        </View>
      </Modal>
      {/* Full-screen image modal (unchanged) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!fullScreenImage}
        onRequestClose={closeFullScreenImage}
      >
        <View style={styles.fullScreenImageOverlay}>
          <TouchableOpacity style={styles.fullScreenImageCloseButton} onPress={closeFullScreenImage}>
            <Text style={styles.fullScreenImageCloseText}>Close</Text>
          </TouchableOpacity>
          {fullScreenImage && (
            <Image
              source={{ uri: fullScreenImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
              onError={(e) => {
                console.error('Full screen image error:', e.nativeEvent.error);
                Alert.alert('Error', 'Failed to load image.');
                closeFullScreenImage();
              }}
            />
          )}
        </View>
      </Modal>
    </>
  );
};
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 5 : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 8,
    marginLeft: 12,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  notificationList: {
    flexGrow: 0,
  },
  notificationContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  notificationItem: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8ECEF',
    overflow: 'hidden',
    zIndex: 1,
  },
  deleteBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteBackgroundContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteBackgroundText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  notificationHeaderText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  notificationSender: {
    fontSize: 14,
    color: '#555',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  notificationTimestamp: {
    fontSize: 12,
    color: '#888',
  },
  notificationSos: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  noNotificationsText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    padding: 20,
  },
  clearButtonContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    padding: 10,
    flexDirection: 'row',
    gap: 5,
  },
  clearAllText: {
    fontSize: 14,
    color: 'gray',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  fullScreenImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: width * 0.9,
    height: height * 0.7,
  },
  fullScreenImageCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
  },
  fullScreenImageCloseText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '600',
  },
});

export default Notification;