import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { HeartPulse, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react-native';


const medicalSafetyTips = [
  { id: 1, icon: <CheckCircle size={24} color="#34C759" />, text: 'Keep a well-stocked first aid kit at home and in your car.' },
  { id: 2, icon: <AlertTriangle size={24} color="#FF9500" />, text: 'Know basic first aid techniques, including CPR.' },
  { id: 3, icon: <CheckCircle size={24} color="#34C759" />, text: 'Wash hands regularly to prevent infections.' },
  { id: 4, icon: <AlertTriangle size={24} color="#FF9500" />, text: 'Store medications safely and check expiration dates.' },
  { id: 5, icon: <CheckCircle size={24} color="#34C759" />, text: 'Stay hydrated and eat a balanced diet for overall health.' },
  { id: 6, icon: <AlertTriangle size={24} color="#FF9500" />, text: 'Schedule regular check-ups with your doctor.' },
];

const MedicalSafetyTipsScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Header with Solid Color */}
      <View style={[styles.header, { backgroundColor: '#00897B' }]}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back to previous screen"
          accessibilityRole="button"
        >
          <ArrowLeft size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerContent}>
          <HeartPulse size={36} color="#fff" />
          <Text style={styles.headerText}>Medical Safety Tips</Text>
        </View>
      </View>

      {/* Tips List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {medicalSafetyTips.map(tip => (
          <View key={tip.id} style={styles.section}>
            <View style={styles.iconContainer}>{tip.icon}</View>
            <View style={styles.textContainer}>
              <Text style={styles.sectionTitle}>{tip.text}</Text>
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
    backgroundColor: '#F2F4F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    lineHeight: 32,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    backgroundColor: '#f2f2f2',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    minHeight: 60,
  },
  iconContainer: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    paddingVertical: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default MedicalSafetyTipsScreen;