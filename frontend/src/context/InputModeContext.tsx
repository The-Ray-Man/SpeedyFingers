import * as React from 'react';
import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

interface InputModeContextType {
  isHandMode: boolean;
  toggleInputMode: () => void;
  setHandMode: (next: boolean) => void;
}

const InputModeContext = createContext<InputModeContextType | undefined>(undefined);

export const InputModeProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isHandMode, setIsHandMode] = useState<boolean>(false);

  const value = useMemo<InputModeContextType>(() => ({
    isHandMode,
    toggleInputMode: () => setIsHandMode(prev => !prev),
    setHandMode: (next: boolean) => setIsHandMode(next),
  }), [isHandMode]);

  return (
    <InputModeContext.Provider value={value}>
      {children}
    </InputModeContext.Provider>
  );
};

export const useInputMode = () => {
  const ctx = useContext(InputModeContext);
  if (!ctx) throw new Error('useInputMode must be used within an InputModeProvider');
  return ctx;
};
