import * as React from 'react';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

export interface UserInfo {
  username: string;
}

interface UserContextType {
  user: UserInfo | null;
  setUser: (user: UserInfo) => void;
  resetUser: () => void;
}

const STORAGE_KEY = 'app:user';

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [user, setUserState] = useState<UserInfo | null>(null);

  // On startup, read from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UserInfo;
        if (parsed && typeof parsed.username === 'string') {
          setUserState(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse user from localStorage');
    }
  }, []);

  // Persist on changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const value = useMemo<UserContextType>(
    () => ({
      user,
      setUser: (u) => setUserState(u),
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
