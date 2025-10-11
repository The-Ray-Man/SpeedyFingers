import * as React from 'react';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

export interface UserInfo {
  username: string;
}

interface UserContextType {
  user: UserInfo | null;
  loading: boolean;
  setUser: (user: UserInfo) => void;
  resetUser: () => void;
}


const STORAGE_KEY = 'app:user';

const UserContext = createContext<UserContextType | undefined>(undefined);

// Helper function to load user from localStorage synchronously
const loadUserFromStorage = (): UserInfo | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserInfo;
      if (parsed && typeof parsed.username === "string") {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to parse user from localStorage", e);
  }
  return null;
};

export const UserProvider: React.FC<PropsWithChildren> = ({ children }) => {
  // Initialize user state synchronously from localStorage
  const [user, setUserState] = useState<UserInfo | null>(() => loadUserFromStorage());

  // Sync changes back to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      loading: false, // No longer async, always loaded synchronously
      setUser: setUserState,
      resetUser: () => setUserState(null),
    }),
    [user]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
};
