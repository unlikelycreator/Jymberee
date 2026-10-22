
import React, { createContext, useState, ReactNode } from 'react';


interface SosLocation {
  id?: string;
  description: string;
  message: string;
  photoUrl?: string;
  timestamp?: string;
}


interface SosContextType {
  sosLocations: SosLocation[];
  setSosLocations: React.Dispatch<React.SetStateAction<SosLocation[]>>;
}


export const SosContext = createContext<SosContextType | undefined>(undefined);

interface SosProviderProps {
  children: ReactNode;
}

export const SosProvider: React.FC<SosProviderProps> = ({ children }) => {
  const [sosLocations, setSosLocations] = useState<SosLocation[]>([]);

  return (
    <SosContext.Provider value={{ sosLocations, setSosLocations }}>
      {children}
    </SosContext.Provider>
  );
};