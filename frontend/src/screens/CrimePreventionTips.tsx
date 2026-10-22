import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Lock, Eye, Wallet, Moon, ShieldAlert, Siren, ArrowLeft } from 'lucide-react-native';


const securityTips = [
  {
    id: 1,
    icon: <Eye size={24} color="#34C759" />,
    title: 'Stay Aware of Your Surroundings',
    content: [
      'Always be mindful of your environment, especially in unfamiliar areas.',
      'Avoid distractions like using your phone or wearing headphones in public.',
      'Trust your instincts—if something feels off, leave the area.',
    ],
  },
  {
    id: 2,
    icon: <Lock size={24} color="#34C759" />,
    title: 'Secure Your Home',
    content: [
      'Install strong locks on doors and windows.',
      'Use a security system or surveillance cameras.',
      'Keep your home well-lit, especially at night.',
      'Don’t hide spare keys in obvious places.',
    ],
  },
  {
    id: 3,
    icon: <Wallet size={24} color="#34C759" />,
    title: 'Protect Your Valuables',
    content: [
      'Avoid displaying expensive items like jewelry or electronics in public.',
      'Keep your bags and wallets close to your body in crowded areas.',
      'Use anti-theft backpacks or purses with secure zippers.',
    ],
  },
  {
    id: 4,
    icon: <Moon size={24} color="#FF9500" />,
    title: 'Stay Safe at Night',
    content: [
      'Walk in well-lit, populated areas.',
      'Avoid shortcuts through alleys or isolated paths.',
      'Travel with a friend or group whenever possible.',
      'Use ride-sharing services or taxis instead of walking alone.',
    ],
  },
  {
    id: 5,
    icon: <ShieldAlert size={24} color="#FF9500" />,
    title: 'Online Safety',
    content: [
      'Avoid sharing personal information on social media.',
      'Use strong, unique passwords for online accounts.',
      'Be cautious when meeting people you’ve only interacted with online.',
      'Report suspicious online activity to authorities.',
    ],
  },
  {
    id: 6,
    icon: <Siren size={24} color="#34C759" />,
    title: 'Emergency Preparedness',
    content: [
      'Save emergency contacts on your phone.',
      'Know the location of the nearest police station or safe zone.',
      'Carry a personal safety alarm or whistle.',
      'Learn basic self-defense techniques.',
    ],
  },
];

const SecurityScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Header with Solid Color */}
      <View style={[styles.header, { backgroundColor: '#D81B60' }]}>
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
          <Siren size={36} color="#fff" />
          <Text style={styles.headerText}>Security Tips</Text>
        </View>
      </View>

      {/* Tips List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {securityTips.map(tip => (
          <View key={tip.id} style={styles.section}>
            <View style={styles.iconContainer}>{tip.icon}</View>
            <View style={styles.textContainer}>
              <Text style={styles.sectionTitle}>{tip.title}</Text>
              {tip.content.map((item, index) => (
                <Text key={index} style={styles.sectionContent}>
                  • {item}
                </Text>
              ))}
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
    alignItems: 'flex-start',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    minHeight: 100,
  },
  iconContainer: {
    width: 40,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 5,
  },
  textContainer: {
    flex: 1,
    paddingVertical: 5,
    minHeight: 80,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  sectionContent: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 4,
    paddingRight: 10,
  },
});

export default SecurityScreen;