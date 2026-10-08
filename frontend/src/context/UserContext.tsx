import * as React from 'react';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export interface UserInfo {
  id: string;
  username: string;
  canManageGestures: boolean;
}

interface UserContextType {
  user: UserInfo | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// The identity is provided by the trusted proxy (X-User-Id / X-User-Name headers)
// and resolved by the backend, so the client only reads it.
const fetchCurrentUser = async (): Promise<UserInfo | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/me`);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      id: data.id,
      username: data.name,
      canManageGestures: !!data.canManageGestures,
    };
  } catch (e) {
    console.warn("Failed to load current user", e);
    return null;
  }
};

export const UserProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser().then(result => {
      if (cancelled) return;
      setUser(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
};
