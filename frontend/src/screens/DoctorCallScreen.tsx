import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, StatusBar } from 'react-native';
import { Phone, Link } from 'lucide-react-native'; 

const DoctorCallScreen = () => {
  const doctors = [
    {
      name: 'Dr. John Doe',
      specialty: 'Cardiologist',
      phone: '1234567890',
      profileUrl: 'https://www.example.com/dr-john-doe',
    },
    {
      name: 'Dr. Jane Smith',
      specialty: 'Dermatologist',
      phone: '0987654321',
      profileUrl: 'https://www.example.com/dr-jane-smith',
    },
    {
      name: 'Dr. Emily White',
      specialty: 'Pediatrician',
      phone: '1122334455',
      profileUrl: 'https://www.example.com/dr-emily-white',
    },
    {
      name: 'Dr. Michael Brown',
      specialty: 'General Physician',
      phone: '5566778899',
      profileUrl: 'https://www.example.com/dr-michael-brown',
    },
  ];

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
  };

  const makeCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch((err) => console.error('Failed to make a call:', err));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#004080" />

      <View style={styles.colorBar}>
        <Text style={styles.header}>Doctor Information</Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.text}>Contact doctors for immediate help:</Text>

        {doctors.map((doctor, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.name}>{doctor.name}</Text>
            <Text style={styles.specialty}>{doctor.specialty}</Text>

            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => makeCall(doctor.phone)}
              >
                <Phone size={18} color="#fff" style={styles.icon} />
                <Text style={styles.buttonText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => openLink(doctor.profileUrl)}
              >
                <Link size={18} color="#fff" style={styles.icon} />
                <Text style={styles.buttonText}>Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
  },
  colorBar: {
    backgroundColor: '#004080',
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  text: {
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
  },
  card: {
    backgroundColor: '#e6f7ff',
    padding: 20,
    marginBottom: 15,
    borderRadius: 10,
    boxShadow: '0 2px 4px rgb(255, 255, 255)',
    elevation: 5,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#004080',
  },
  specialty: {
    fontSize: 16,
    marginTop: 5,
    color: '#0066cc',
  },
  actionContainer: {
    flexDirection: 'row',
    marginTop: 15,
    justifyContent: 'space-between',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#004080',
    borderRadius: 8,
    flex: 0.45,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#0066cc',
    borderRadius: 8,
    flex: 0.45,
  },
  buttonText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 10,
  },
  icon: {
    padding: 5,
  },
});

export default DoctorCallScreen;