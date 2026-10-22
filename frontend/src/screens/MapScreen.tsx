import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  View,
  Image,
  Modal,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Vibration,
} from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import MapViewStyle from '../utils/MapViewStyle.json';
import GetLocation from 'react-native-get-location';
import api from '../utils/api.ts';
import { useLocation } from '../context/LocationContext.tsx';
import { MapPin, ZoomIn, ZoomOut, X, AlertTriangle } from 'lucide-react-native';
import {
  useRoute,
  useFocusEffect,
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import axios from 'axios';
import PolylineDecoder from '@mapbox/polyline';

interface SosData {
  _id: string;
  userId: {
    name?: string;
    phoneNumber?: string;
    profilePicture?: string;
  };
  latitude: number;
  longitude: number;
  description?: string;
  timestamp: string;
}

const GRAPHHOPPER_API_KEY = '91a36f59-0f19-4bec-b29c-d83bacc6304a';
const REFRESH_INTERVAL = 15000;
const MAX_ZOOM_DELTA = 100;

const DEFAULT_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const EmergencyMarkerImage = memo(({ profilePicture, style }: { profilePicture?: string; style?: any }) => {
  const [isValidImage, setIsValidImage] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (
      !profilePicture ||
      profilePicture.trim() === '' ||
      profilePicture === 'jymberee' ||
      !profilePicture.startsWith('http')
    ) {
      setIsValidImage(false);
      setHasChecked(true);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    fetch(profilePicture, { method: 'HEAD', signal: controller.signal })
      .then(res => {
        const valid = res.ok && (res.headers.get('content-type')?.startsWith('image/') ?? false);
        setIsValidImage(valid);
      })
      .catch(() => setIsValidImage(false))
      .finally(() => {
        clearTimeout(timeout);
        setHasChecked(true);
      });

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [profilePicture]);

  if (!hasChecked || !isValidImage) {
    return <Image source={require('../assets/images/pin-map.png')} style={style || styles.emergencyPin} />;
  }

  return (
    <Image
      source={{ uri: profilePicture }}
      style={style || styles.emergencyPin}
      resizeMode="cover"
      onError={() => setIsValidImage(false)}
    />
  );
});

export default function Map() {
  const route = useRoute();
  const navigation = useNavigation();
  const { location, setLocation, defaultLocation } = useLocation();

  const [sosLocations, setSosLocations] = useState<SosData[]>([]);
  const [selectedSos, setSelectedSos] = useState<SosData | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  const [notificationSos, setNotificationSos] = useState<{
    latitude: number;
    longitude: number;
    description?: string;
  } | null>(null);

  const mapRef = useRef<MapView>(null);
  const isFetchingLocation = useRef(false);
  const currentRegionRef = useRef<Region>(defaultLocation || DEFAULT_REGION);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    Animated.timing(modalOpacity, {
      toValue: selectedSos ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [selectedSos]);

  // FIXED: Handle notification params correctly + fixes race condition
  // where sosLocations wasn't loaded yet when params were cleared.
  // notificationSos is now set immediately and rendered independently
  // (see fallback marker below), so it shows on the map right away
  // instead of waiting for /sos/active to return and match.
  useFocusEffect(
    useCallback(() => {
      const params = route.params as any;

      if (params?.sosLocation) {
        const lat = parseFloat(params.sosLocation.latitude);
        const lng = parseFloat(params.sosLocation.longitude);
        const desc = params.description || 'Emergency Alert';

        if (!isNaN(lat) && !isNaN(lng)) {
          setNotificationSos({ latitude: lat, longitude: lng, description: desc });

          setTimeout(() => {
            mapRef.current?.animateToRegion(
              {
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              },
              1200
            );

            const matched = sosLocations.find(
              s =>
                Math.abs(s.latitude - lat) < 0.0001 &&
                Math.abs(s.longitude - lng) < 0.0001
            );

            if (matched) {
              setSelectedSos(matched);
              if (location) {
                fetchRoute(location, matched);
              }
            }
          }, 800);

          // CORRECT WAY: Clear params using CommonActions
          // Note: notificationSos state (set above) persists independently
          // of route.params being cleared, so the fallback marker keeps working.
          navigation.dispatch(
            CommonActions.setParams({
              sosLocation: undefined,
              description: undefined,
            })
          );
        }
      }
    }, [route.params, sosLocations, location, navigation])
  );

  // NEW: Retry matching once sosLocations loads/updates, in case the
  // notification arrived before the SOS list finished fetching.
  useEffect(() => {
    if (!notificationSos || selectedSos) return;

    const matched = sosLocations.find(
      s =>
        Math.abs(s.latitude - notificationSos.latitude) < 0.0001 &&
        Math.abs(s.longitude - notificationSos.longitude) < 0.0001
    );

    if (matched) {
      setSelectedSos(matched);
      if (location) {
        fetchRoute(location, matched);
      }
    }
  }, [sosLocations, notificationSos, selectedSos, location]);

  const CustomUserLocation = () => (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <View style={styles.userPinContainer}>
        <View style={styles.userPinPulse} />
        <View style={styles.userPin} />
      </View>
    </Animated.View>
  );

  const getUserCurrentPosition = useCallback(async () => {
    if (isFetchingLocation.current) return;
    isFetchingLocation.current = true;

    try {
      const loc = await GetLocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 30000,
      });

      const newRegion: Region = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setLocation(newRegion);
      currentRegionRef.current = newRegion;
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      console.warn('Location error:', error);
      const fallback = defaultLocation || DEFAULT_REGION;
      setLocation(fallback);
      currentRegionRef.current = fallback;
    } finally {
      isFetchingLocation.current = false;
      setLoading(false);
    }
  }, [setLocation, defaultLocation]);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        await getUserCurrentPosition();
      } else {
        setLoading(false);
      }
    } else {
      await getUserCurrentPosition();
    }
  };

  const fetchSosLocations = async () => {
    try {
      const response = await api.get('/sos/active');
      if (response?.data?.locations && Array.isArray(response.data.locations)) {
        const valid: SosData[] = response.data.locations
          .map((sos: any) => {
            const lat = Number(sos.latitude);
            const lng = Number(sos.longitude);
            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

            const timeDiff = (Date.now() - new Date(sos.timestamp).getTime()) / 60000;
            if (timeDiff > 30) return null;

            return {
              _id: sos._id?.toString() || Math.random().toString(),
              userId: {
                name: sos.userId?.name || 'Unknown',
                phoneNumber: sos.userId?.phoneNumber || '',
                profilePicture: sos.userId?.profilePicture || '',
              },
              latitude: lat,
              longitude: lng,
              description: sos.description || 'Emergency',
              timestamp: sos.timestamp,
            };
          })
          .filter(Boolean) as SosData[];

        setSosLocations(valid);
      }
    } catch (error) {
      console.error('SOS fetch failed:', error);
    }
  };

  const fetchRoute = async (origin: Region, dest: SosData) => {
    const url = `https://graphhopper.com/api/1/route?point=${origin.latitude},${origin.longitude}&point=${dest.latitude},${dest.longitude}&profile=car&calc_points=true&points_encoded=true&key=${GRAPHHOPPER_API_KEY}`;

    try {
      const res = await axios.get(url);
      if (res.data?.paths?.[0]?.points) {
        const points = PolylineDecoder.decode(res.data.paths[0].points);
        const coords = points
          .map(([lat, lng]: [number, number]) => ({
            latitude: Number(lat),
            longitude: Number(lng),
          }))
          .filter(p => !isNaN(p.latitude) && !isNaN(p.longitude));
        setRouteCoordinates(coords);
      }
    } catch (error) {
      console.log('Route error:', error);
      setRouteCoordinates([]);
    }
  };

  const handleMarkerPress = (sos: SosData) => {
    if (!location) return;

    setSelectedSos(sos);
    fetchRoute(location, sos);

    const coords = [
      { latitude: location.latitude, longitude: location.longitude },
      { latitude: sos.latitude, longitude: sos.longitude },
    ];

    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 100, left: 100, right: 100, bottom: 400 },
      animated: true,
    });
  };

  const ZOOM_STEP = 2;

  const handleZoomIn = () => {
    mapRef.current?.getMapBoundaries().then((boundaries) => {
      const { northEast, southWest } = boundaries;
      const currentLatDelta = northEast.latitude - southWest.latitude;
      const currentLngDelta = northEast.longitude - southWest.longitude;
      const newLatDelta = currentLatDelta / ZOOM_STEP;
      const newLngDelta = currentLngDelta / ZOOM_STEP;

      if (newLatDelta < 0.0005) return;

      const centerLat = (northEast.latitude + southWest.latitude) / 2;
      const centerLng = (northEast.longitude + southWest.longitude) / 2;

      mapRef.current?.animateToRegion({
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: newLatDelta,
        longitudeDelta: newLngDelta,
      }, 350);
    });
  };

  const handleZoomOut = () => {
    mapRef.current?.getMapBoundaries().then((boundaries) => {
      const { northEast, southWest } = boundaries;
      const currentLatDelta = northEast.latitude - southWest.latitude;
      const currentLngDelta = northEast.longitude - southWest.longitude;

      let newLatDelta = currentLatDelta * ZOOM_STEP;
      let newLngDelta = currentLngDelta * ZOOM_STEP;

      newLatDelta = Math.min(newLatDelta, 160);
      newLngDelta = Math.min(newLngDelta, 160 * 1.8);

      const centerLat = (northEast.latitude + southWest.latitude) / 2;
      const centerLng = (northEast.longitude + southWest.longitude) / 2;

      mapRef.current?.animateToRegion({
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: newLatDelta,
        longitudeDelta: newLngDelta,
      }, 350);
    });
  };

  const clearSelection = () => {
    setSelectedSos(null);
    setRouteCoordinates([]);
    setShowImageModal(false);
    setImageDimensions(null);
    setNotificationSos(null);
  };

  const openImageModal = () => {
    const url = selectedSos?.userId?.profilePicture;
    if (!url || url.trim() === '' || url === 'jymberee' || !url.startsWith('http')) return;

    Vibration.vibrate(50);
    Image.getSize(
      url,
      (w, h) => setImageDimensions({ width: w, height: h }),
      () => Alert.alert('Error', 'Failed to load image')
    );
    setShowImageModal(true);
  };

  const onRegionChangeComplete = (region: Region) => {
    currentRegionRef.current = {
      ...region,
      latitudeDelta: Math.min(region.latitudeDelta, MAX_ZOOM_DELTA),
      longitudeDelta: Math.min(region.longitudeDelta, MAX_ZOOM_DELTA),
    };
  };

  useEffect(() => {
    requestLocationPermission();
    fetchSosLocations();
    const interval = setInterval(fetchSosLocations, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const screen = Dimensions.get('window');
  const modalSize = imageDimensions
    ? {
      width: Math.min(imageDimensions.width, screen.width * 0.9),
      height: Math.min(imageDimensions.height, screen.height * 0.8),
    }
    : { width: screen.width * 0.9, height: screen.height * 0.6 };

  // Whether the notification SOS is already represented by a marker
  // coming from sosLocations (backend list). If not, we render a
  // fallback marker directly from notificationSos so it's visible
  // immediately, without waiting for /sos/active to include it.
  const notificationSosMatchedInList =
    !!notificationSos &&
    sosLocations.some(
      s =>
        Math.abs(s.latitude - notificationSos.latitude) < 0.0001 &&
        Math.abs(s.longitude - notificationSos.longitude) < 0.0001
    );

  return (
    <View style={styles.container}>
      {loading && !mapReady && (
        <View style={styles.bufferOverlay}>
          <View style={styles.bufferCard}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.bufferText}>Initializing map...</Text>
          </View>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? 'google' : undefined}
        customMapStyle={MapViewStyle}
        initialRegion={currentRegionRef.current}
        showsUserLocation={false}
        onMapReady={() => {
          setMapReady(true);
          if (!location) getUserCurrentPosition();
        }}
        onRegionChangeComplete={onRegionChangeComplete}
        followsUserLocation={false}
        showsMyLocationButton={false}
      >
        {location && !isNaN(location.latitude) && !isNaN(location.longitude) && (
          <Marker coordinate={location} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <CustomUserLocation />
          </Marker>
        )}

        {sosLocations.map((sos) => {
          const lat = Number(sos.latitude);
          const lng = Number(sos.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          const isNotificationSos =
            notificationSos &&
            Math.abs(lat - notificationSos.latitude) < 0.0001 &&
            Math.abs(lng - notificationSos.longitude) < 0.0001;

          return (
            <Marker
              key={`${sos._id}-${sos.userId?.profilePicture || 'default'}`}
              coordinate={{ latitude: lat, longitude: lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => handleMarkerPress(sos)}
              tracksViewChanges={Platform.OS === 'ios'}
            >
              {isNotificationSos ? (
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <View style={styles.notificationPin}>
                    <AlertTriangle size={38} color="white" />
                  </View>
                </Animated.View>
              ) : (
                <EmergencyMarkerImage profilePicture={sos.userId?.profilePicture} />
              )}
            </Marker>
          );
        })}

        {/* NEW: Fallback marker for notification SOS, shown immediately
            even if the backend /sos/active list hasn't loaded/included
            it yet. Once sosLocations catches up and contains a match,
            this fallback disappears and the normal marker above takes over
            (no duplicate marker is rendered). */}
        {notificationSos && !notificationSosMatchedInList && (
          <Marker
            coordinate={{ latitude: notificationSos.latitude, longitude: notificationSos.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={styles.notificationPin}>
                <AlertTriangle size={38} color="white" />
              </View>
            </Animated.View>
          </Marker>
        )}

        {routeCoordinates.length > 0 && (
          <Polyline coordinates={routeCoordinates} strokeColor="#D32F2F" strokeWidth={5} />
        )}
      </MapView>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={getUserCurrentPosition}>
          <MapPin size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.zoomGroup}>
          <TouchableOpacity style={styles.controlBtn} onPress={handleZoomIn}>
            <ZoomIn size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={handleZoomOut}>
            <ZoomOut size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={!!selectedSos} transparent animationType="none">
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.modal, { opacity: modalOpacity }]}>
            <Text style={styles.modalTitle}>Emergency Alert!</Text>
            {selectedSos && (
              <>
                <View style={styles.profileRow}>
                  <TouchableOpacity onPress={openImageModal}>
                    <EmergencyMarkerImage
                      profilePicture={selectedSos.userId?.profilePicture}
                      style={styles.profilePic}
                    />
                  </TouchableOpacity>
                  <Text style={styles.userName}>{selectedSos.userId?.name || 'Unknown'}</Text>
                </View>

                <Text style={styles.desc}>{selectedSos.description || 'No description'}</Text>

                <View style={styles.info}>
                  <Text style={styles.label}>Time:</Text>
                  <Text>{new Date(selectedSos.timestamp).toLocaleString()}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.label}>Location:</Text>
                  <Text>{selectedSos.latitude.toFixed(4)}, {selectedSos.longitude.toFixed(4)}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.label}>Phone:</Text>
                  <Text>{selectedSos.userId?.phoneNumber || 'N/A'}</Text>
                </View>

                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.btnClose} onPress={() => setSelectedSos(null)}>
                    <Text style={styles.btnText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnClear} onPress={clearSelection}>
                    <Text style={styles.btnText}>Clear Route</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={showImageModal} transparent>
        <View style={styles.imageBackdrop}>
          <View style={[styles.imageContainer, modalSize]}>
            <TouchableOpacity style={styles.closeX} onPress={() => setShowImageModal(false)}>
              <X size={32} color="white" strokeWidth={3} />
            </TouchableOpacity>
            {selectedSos?.userId?.profilePicture &&
              selectedSos.userId.profilePicture.trim() &&
              selectedSos.userId.profilePicture !== 'jymberee' &&
              selectedSos.userId.profilePicture.startsWith('http') && (
                <Image
                  source={{ uri: selectedSos.userId.profilePicture }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="contain"
                />
              )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  map: { ...StyleSheet.absoluteFill },
  controls: { position: 'absolute', top: 50, right: 16, gap: 12 },
  controlBtn: {
    backgroundColor: '#ff0037',
    padding: 14,
    borderRadius: 50,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  zoomGroup: { gap: 10 },
  emergencyPin: { width: 44, height: 44, borderRadius: 50 },
  userPinContainer: { alignItems: 'center', justifyContent: 'center' },
  userPinPulse: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff000d',
    opacity: 0.35,
    position: 'absolute',
  },
  userPin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ff0000',
    borderWidth: 3.5,
    borderColor: 'white',
    elevation: 8,
  },
  notificationPin: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#ffffff',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#D32F2F', textAlign: 'center', marginBottom: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  profilePic: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#D32F2F', marginRight: 12 },
  userName: { fontSize: 18, fontWeight: '600' },
  desc: { fontSize: 15, color: '#333', marginBottom: 16, lineHeight: 22 },
  info: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontWeight: '600', color: '#666' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnClose: { flex: 1, backgroundColor: '#007AFF', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnClear: { flex: 1, backgroundColor: '#D32F2F', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  imageBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  imageContainer: { backgroundColor: 'black', borderRadius: 16, overflow: 'hidden', position: 'relative' },
  closeX: { position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 },
  bufferOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(240, 244, 248, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  bufferCard: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 12,
  },
  bufferText: { marginTop: 16, fontSize: 17, color: '#333', fontWeight: '600' },
});