// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   StyleSheet,
//   Alert,
//   ActivityIndicator,
//   Platform,
//   Text,
// } from 'react-native';
// import { launchCamera, ImagePickerResponse, Asset } from 'react-native-image-picker';
// import axios from 'axios';
// import { PermissionsAndroid } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';


// // Define types for the SOS payload
// interface SOSPayload {
//   description: string;
//   message: string;
//   photoUrl: string;
// }

// const Camera: React.FC = () => {
//   const [cameraLoading, setCameraLoading] = useState<boolean>(false);

//   const requestCameraPermission = async (): Promise<boolean> => {
//     if (Platform.OS !== 'android') return true;

//     try {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.CAMERA,
//         {
//           title: 'Camera Permission',
//           message: 'This app needs camera access to take photos.',
//           buttonNeutral: 'Ask Me Later',
//           buttonNegative: 'Cancel',
//           buttonPositive: 'OK',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     } catch (error: unknown) {
//       console.error('Permission error:', error);
//       Alert.alert('Error', 'Failed to request camera permission');
//       return false;
//     }
//   };

//   const takePhotoAndUpload = async (): Promise<void> => {
//     if (cameraLoading) return;

//     const hasPermission = await requestCameraPermission();
//     if (!hasPermission) {
//       Alert.alert('Error', 'Camera permission denied');
//       return;
//     }

//     const options = {
//       mediaType: 'photo' as const,
//       cameraType: 'back' as const,
//       saveToPhotos: false,
//       includeBase64: true,
//     };

//     setCameraLoading(true);

//     launchCamera(options, async (response: ImagePickerResponse) => {
//       if (response.didCancel) {
//         console.log('User cancelled camera');
//         setCameraLoading(false);
//       } else if (response.errorCode) {
//         console.error('Camera error:', response.errorCode, response.errorMessage);
//         Alert.alert('Error', response.errorMessage || 'Camera error occurred');
//         setCameraLoading(false);
//       } else if (response.assets && response.assets.length > 0) {
//         const photo: Asset = response.assets[0];
//         console.log('Photo:', photo);

//         try {
//           // Use base64 data directly from image-picker
//           if (!photo.base64) {
//             throw new Error('Base64 data not available');
//           }
//           const base64DataUrl = `data:image/jpeg;base64,${photo.base64}`;
//           console.log('Base64 Image length:', base64DataUrl.length);

//           const token = await AsyncStorage.getItem('token');
//           console.log('Token:', token);

//           if (!token) {
//             throw new Error('No token found');
//           }

//           const payload = {
//             image: base64DataUrl,
//           };

//           const uploadResponse = await axios.post<{ url?: string }>(
//             'http://195.250.30.168:8000/api/v1/images/upload-image',
//             payload,
//             {
//               headers: {
//                 'Content-Type': 'application/json',
//                 Authorization: `Bearer ${token}`,
//               },
//             },
//           );
          
//           Alert.alert('Success', 'Photo uploaded successfully!');
//           console.log('Upload response:', uploadResponse.data);
//         } catch (error: unknown) {
//           console.error('Error uploading photo:', error);
//           Alert.alert('Error', (error as Error).message || 'Failed to upload photo');
//         } finally {
//           setCameraLoading(false);
//         }
//       } else {
//         Alert.alert('Error', 'No photo captured');
//         setCameraLoading(false);
//       }
//     });
//   };

//   // Automatically trigger camera on mount
//   useEffect(() => {
//     takePhotoAndUpload();
//   }, []); // Empty dependency array ensures it runs once

//   return (
//     <View style={styles.container}>
//       {cameraLoading ? (
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color="#D80B1E" />
//           <Text style={styles.loadingText}>Processing photo...</Text>
//         </View>
//       ) : (
//         <Text style={styles.title}>Camera</Text>
//       )}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     textAlign: 'center',
//     marginTop: 20,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingText: {
//     marginTop: 10,
//     fontSize: 16,
//     color: '#333',
//   },
// });

// export default Camera;