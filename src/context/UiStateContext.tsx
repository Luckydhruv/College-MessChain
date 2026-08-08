import React, { createContext, useState, ReactNode } from 'react';

export interface UiStateContextType {
  processing: string | null;
  setProcessing: React.Dispatch<React.SetStateAction<string | null>>;
  launchProcessing: (id: string, action?: () => Promise<void> | void) => Promise<void>;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

export const UiStateContext = createContext<UiStateContextType | undefined>(undefined);

export function UiStateProvider({ children }: { children: ReactNode }) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
