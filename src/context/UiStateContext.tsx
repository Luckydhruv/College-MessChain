import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { setOnSessionExpired, setCachedToken } from '../api/client';
import { AuthContext } from './AuthContext';

export interface UiStateContextType {
  processing: string | null;
  setProcessing: React.Dispatch<React.SetStateAction<string | null>>;
  launchProcessing: (id: string, action?: () => Promise<void> | void) => Promise<void>;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

export const UiStateContext = createContext<UiStateContextType | undefined>(undefined);

export function useUiState(): UiStateContextType {
  const ctx = useContext(UiStateContext);
  if (!ctx) {
    throw new Error('useUiState must be used within a UiStateProvider');
  }
  return ctx;
}

export function UiStateProvider({ children }: { children: ReactNode }) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const auth = useContext(AuthContext);

  // Wire the global 401 interceptor to trigger logout
  useEffect(() => {
    setOnSessionExpired(() => {
      if (auth) {
        auth.handleLogout();
        auth.setLoginError('Your session expired. Sign in again.');
      }
    });

    // Cache token for the API client
    if (auth?.session?.token) {
      setCachedToken(auth.session.token);
    } else {
      setCachedToken(null);
    }

    return () => setOnSessionExpired(null);
  }, [auth?.session?.token]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const launchProcessing = async (id: string, action?: () => Promise<void> | void) => {
    setProcessing(id);
    try {
      if (action) {
        await action();
      }
    } finally {
      setProcessing((current) => (current === id ? null : current));
    }
  };

  return (
    <UiStateContext.Provider
      value={{
        processing,
        setProcessing,
        launchProcessing,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </UiStateContext.Provider>
  );
}
