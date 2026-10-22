// context/AuthContext.ts
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EmergencyContact {
  _id?: string;
  name: string;
  number: string;
}

export interface PreferredLocation {
  _id?: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface User {
  _id?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  countryCode?: string;
  postalCode?: string;
  profilePicture?: string;
  preferredLocations?: PreferredLocation[];
  emergencyContacts?: EmergencyContact[];
  referralCode?: string;
  status?: string;
  // add any other fields you use
}

export interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  emergencyContacts: EmergencyContact[];
  setEmergencyContacts: React.Dispatch<React.SetStateAction<EmergencyContact[]>>;
  isLoggedIn: boolean;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const loggedIn = await AsyncStorage.getItem('isLoggedIn');
        if (loggedIn === 'true') {
          setIsLoggedIn(true);
          const userData = await AsyncStorage.getItem('user');
          if (userData) {
            try {
              const parsedUser: User = JSON.parse(userData);
              setUser(parsedUser);
              setEmergencyContacts(parsedUser.emergencyContacts || []);
            } catch (parseError) {
              console.log('Error parsing user data:', parseError);
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.log('Error checking login status:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkLoginStatus();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        emergencyContacts,
        setEmergencyContacts,
        isLoggedIn,
        setIsLoggedIn,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};