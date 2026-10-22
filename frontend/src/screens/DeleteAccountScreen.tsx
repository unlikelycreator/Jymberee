import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Vibration,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Trash2, ShieldAlert } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../utils/api';
import { RootStackParamList } from '../navigation/AppNavigator';

const DeleteAccountScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');
  const { setUser, setIsLoggedIn } = useAuth(); 
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleDeleteAccount = async () => {
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for deleting your account.');
      Vibration.vibrate(100); 
      return;
    }

    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await api.delete('/auth/delete-account', { data: { reason } });

              await AsyncStorage.clear();
              setUser(null);
              setIsLoggedIn(false); 

              Vibration.vibrate([100, 50, 100]); 


              Alert.alert(
                'Account Deleted',
                'Your account has been successfully deleted.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }], 
                      });
                    },
                  },
                ],
                { cancelable: false }
              );
            } catch (error: any) {
              console.error('Error deleting account:', error);
              Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to delete account. Please try again.'
              );
              Vibration.vibrate([100, 100]); 
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            Vibration.vibrate(50);
            navigation.goBack();
          }}
        >
          <ArrowLeft size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.header}>
          <Text style={styles.title}>Delete Account</Text>
          <Text style={styles.subtitle}>Permanently remove your account and data</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.warningText}>
            Deleting your account will remove all your personal information, emergency contacts, and preferred locations. This action is irreversible.
          </Text>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Reason for deletion (required)"
              placeholderTextColor="#9CA3AF"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              autoCapitalize="sentences"
              accessibilityLabel="Reason for account deletion"
            />
          </View>

          <TouchableOpacity
            style={[styles.deleteButton, loading && styles.deleteButtonDisabled]}
            onPress={() => {
              Vibration.vibrate(50);
              handleDeleteAccount();
            }}
            disabled={loading}
            accessibilityLabel="Delete Account Button"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.buttonContent}>
                <Trash2 size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Delete Account</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.safetyNoteContainer}>
          <ShieldAlert size={16} color="#DC2626" />
          <Text style={styles.safetyNote}>
            If you're experiencing issues, contact support before deleting.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E3A8A',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '400',
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  warningText: {
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 20,
    lineHeight: 20,
    fontWeight: '500',
  },
  inputGroup: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  input: {
    flex: 1,
    minHeight: 100,
    color: '#1F2937',
    fontSize: 16,
    paddingVertical: 12,
    fontWeight: '500',
    textAlignVertical: 'top',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: '#EF4444',
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  safetyNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  safetyNote: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default DeleteAccountScreen;