import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Phone, HeartPulse, MapPin, Shield, AlertCircle, Flame, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  'first-aid-guide': undefined;
  'safety-tips': undefined;
  'crime-prevention-tips': undefined;
  'fire-safety-tips': undefined;
  'medical-safety-tips': undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Option {
  id: string;
  title: string;
  subtitle: string;
  icon: 'Phone' | 'HeartPulse' | 'MapPin' | 'Shield' | 'AlertCircle' | 'Flame';
  action: () => void;
  gradient: [string, string];
}

const MoreScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const options: Option[] = [
    {
      id: '2',
      title: 'First Aid Guide',
      subtitle: 'Quick tips for basic first aid',
      icon: 'HeartPulse',
      action: () => navigation.navigate('first-aid-guide'),
      gradient: ['#FF9500', '#FFAA33'],
    },
    {
      id: '3',
      title: 'Safety Tips',
      subtitle: 'General safety guidelines',
      icon: 'Shield',
      action: () => navigation.navigate('safety-tips'),
      gradient: ['#5856D6', '#7D7AFF'],
    },
    {
      id: '4',
      title: 'Crime Prevention',
      subtitle: 'Tips to stay safe from crime',
      icon: 'AlertCircle',
      action: () => navigation.navigate('crime-prevention-tips'),
      gradient: ['#1C1C1E', '#333333'],
    },
    {
      id: '5',
      title: 'Fire Safety Tips',
      subtitle: 'Prevent fire hazards and stay safe',
      icon: 'Flame',
      action: () => navigation.navigate('fire-safety-tips'),
      gradient: ['#D32F2F', '#FF7043'],
    },
    {
      id: '6',
      title: 'Medical Safety Tips',
      subtitle: 'Guidelines for medical emergencies',
      icon: 'HeartPulse',
      action: () => navigation.navigate('medical-safety-tips'),
      gradient: ['#00897B', '#26A69A'],
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>More Options</Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.subtitle}>Explore additional emergency and safety options:</Text>

        {options.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.card}
            onPress={option.action}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: option.gradient[0] }]}>
              {option.icon === 'Phone' && <Phone size={24} color="#fff" />}
              {option.icon === 'HeartPulse' && <HeartPulse size={24} color="#fff" />}
              {option.icon === 'MapPin' && <MapPin size={24} color="#fff" />}
              {option.icon === 'Shield' && <Shield size={24} color="#fff" />}
              {option.icon === 'AlertCircle' && <AlertCircle size={24} color="#fff" />}
              {option.icon === 'Flame' && <Flame size={24} color="#fff" />}
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{option.title}</Text>
              <Text style={styles.subtitleText}>{option.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingBottom: 16,
  },
  header: {
    backgroundColor: '#FF3B30',
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    padding: 8,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContainer: {
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#888',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    padding: 12,
    borderRadius: 8,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
  },
});

export default MoreScreen;