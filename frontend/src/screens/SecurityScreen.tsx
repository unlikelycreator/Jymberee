import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';

const SecurityScreen = () => {
  const [emergencyNumber, setEmergencyNumber] = useState('112');

  const makeCall = () => {
    Linking.openURL(`tel:${emergencyNumber}`).catch((err) => {
      console.error('Failed to make a call:', err);
      Alert.alert('Error', 'Unable to make the call. Please try again.');
    });
  };

 const openHelpLink = (url: string) => {
  Linking.openURL(url).catch((err) => {
    console.error('Failed to open URL:', err);
    Alert.alert('Error', 'Unable to open the link. Please try again.');
  });
};
  const sendAlert = () => {
    Alert.alert('Alert Sent', 'Emergency services have been notified.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Security Services</Text>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Access emergency services or get help immediately.
        </Text>

        <TouchableOpacity style={styles.button} onPress={makeCall}>
          <Text style={styles.buttonText}>Call Emergency Services</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.alertButton]} onPress={sendAlert}>
          <Text style={styles.buttonText}>Send Emergency Alert</Text>
        </TouchableOpacity>

        <View style={styles.linkSection}>
          <Text style={styles.subHeader}>Support Links:</Text>
          <TouchableOpacity
            style={styles.link}
            onPress={() => openHelpLink('https://www.example.com/women-support')}
          >
            <Text style={styles.linkText}>Women’s Support Services</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.link}
            onPress={() => openHelpLink('https://www.example.com/child-support')}
          >
            <Text style={styles.linkText}>Child Support Services</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default SecurityScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  content: {
    padding: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  alertButton: {
    backgroundColor: '#ff0000',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  linkSection: {
    marginTop: 20,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  link: {
    paddingVertical: 10,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  linkText: {
    fontSize: 16,
    color: '#007bff',
  },
});
