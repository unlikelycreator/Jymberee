import { createContext, useContext, useState, ReactNode } from 'react';


interface Location {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}


export interface LocationContextType {
  location: Location;
  setLocation: (location: Location) => void;
  defaultLocation: Location;
}


export const LocationContext = createContext<LocationContextType | undefined>(undefined);


export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const defaultLocation: Location = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const [location, setLocation] = useState<Location>(defaultLocation);
 

  return (
    <LocationContext.Provider value={{ location, setLocation, defaultLocation }}>
      {children}
    </LocationContext.Provider>
  );
};