import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { HeartPulse, Bandage, Flame, UserX, Footprints, ArrowLeft } from 'lucide-react-native';



const firstAidTips = [
  {
    id: 1,
    icon: <HeartPulse size={24} color="#34C759" />,
    title: 'CPR (Cardiopulmonary Resuscitation)',
    content: [
      'Check for responsiveness.',
      'Call for emergency help.',
      'Perform chest compressions at a rate of 100-120 per minute.',
      'Give rescue breaths if trained.',
    ],
  },
  {
    id: 2,
    icon: <Bandage size={24} color="#34C759" />,
    title: 'Bleeding',
    content: [
      'Apply direct pressure to the wound using a clean cloth or bandage.',
      'Elevate the injured area if possible.',
      'Seek medical attention if bleeding doesn’t stop.',
    ],
  },
  {
    id: 3,
    icon: <Flame size={24} color="#FF9500" />,
    title: 'Burns',
    content: [
      'Cool the burn under running water for at least 10 minutes.',
      'Cover the burn with a sterile, non-stick dressing.',
      'Avoid applying ice or creams to the burn.',
    ],
  },
  {
    id: 4,
    icon: <UserX size={24} color="#FF9500" />,
    title: 'Choking',
    content: [
      'Encourage the person to cough.',
      'Perform the Heimlich maneuver if the person cannot breathe.',
      'Call for emergency help if the obstruction is not cleared.',
    ],
  },
  {
    id: 5,
    icon: <Footprints size={24} color="#34C759" />,
    title: 'Sprains and Strains',
    content: [
      'Rest the injured area.',
      'Apply ice to reduce swelling.',
      'Compress the area with a bandage.',
      'Elevate the injured limb.',
    ],
  },
];

const FirstAidGuide = () => {
  const navigation = useNavigation();

  return (
      <View style={styles.container}>
        {/* Header with Gradient */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            accessibilityLabel="Go back to previous screen"
            accessibilityRole="button"
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <HeartPulse size={36} color="#fff" />
            <Text style={styles.headerText}>First Aid Guide</Text>
          </View>
      </View>

        {/* Tips List */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {firstAidTips?.map(tip => (
            <View
              key={tip.id}
              style={styles.section}
            >
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
  },
  header: {
    backgroundColor: '#34C759',
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
  },
  sectionContent: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 4,
    paddingRight: 10,
  },
});

export default FirstAidGuide;