import React from 'react';
import { Text, Image, View, StyleSheet, TouchableOpacity } from 'react-native';
import { WifiOff, RefreshCw } from 'lucide-react-native';
interface OfflinePageProps {
  onRetry: () => void;
}

const OfflinePage: React.FC<OfflinePageProps> = ({ onRetry }) => {
  return (
    <View style={styles.container}>
      <WifiOff size={80} color="#D80B1E" style={styles.wifiIcon} />
      <Image
        source={require('../../assets/images/offline.png')} 
        style={styles.offlineImage}resizeMode="contain"/>
      <Text style={styles.title}>No Internet Connection</Text>
      <Text style={styles.message}>
        Please check your network connection and try again.
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <RefreshCw size={24} color="white" />
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  wifiIcon: {
    marginBottom: 10,
  },
  offlineImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#D80B1E',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D80B1E',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 10,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default OfflinePage;