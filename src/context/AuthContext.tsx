import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Role } from '../theme';
import { AuthSession } from '../types/auth.types';
import { readStoredSession, writeStoredSession, clearStoredSession } from '../utils/storage';
import { loginUser, registerUser } from '../api/auth';

export interface AuthContextType {
  session: AuthSession | null;
  role: Role;
  setRole: React.Dispatch<React.SetStateAction<Role>>;
  bootstrapping: boolean;
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginPassword: string;
  setLoginPassword: (password: string) => void;
  loginError: string;
  setLoginError: (error: string) => void;
  screen: string;
  setScreen: (screen: string) => void;
  handleLogin: (emailOverride?: string, passwordOverride?: string) => Promise<void>;
  handleRegister: (data: {
    name: string;
    email: string;
    password: string;
    rollNumber: string;
    messId: string;
  }) => Promise<void>;
  handleLogout: () => Promise<void>;
}


const roleHome: Record<Role, string> = {
  admin: 'dashboard',
  student: 'qr-scanner',
  staff: 'dashboard',
};

/**
 * Decode a JWT and check if it has expired.
 * Returns true if valid (not expired), false if expired or unparseable.
 */
function isTokenValid(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return true; // no expiry claim = treat as valid
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [screen, setScreen] = useState<string>('qr-scanner');

  useEffect(() => {
    setScreen(roleHome[role]);
  }, [role]);

  useEffect(() => {
    let mounted = true;

    const hydrateSession = async () => {
      const storedSession = await readStoredSession();
      if (!mounted) return;

      if (storedSession?.email && storedSession?.role && storedSession?.token) {
        // Validate JWT expiry before restoring session (Phase 1, item 1.3)
        if (isTokenValid(storedSession.token)) {
          setSession(storedSession);
          setRole(storedSession.role);
        } else {
          // Token expired — clear and force re-login
          await clearStoredSession();
        }
      }
      setBootstrapping(false);
    };

    hydrateSession();
    return () => { mounted = false; };
  }, []);

  const handleLogin = async (emailOverride?: string, passwordOverride?: string) => {
    const rawEmail = emailOverride !== undefined ? emailOverride : loginEmail;
    const rawPassword = passwordOverride !== undefined ? passwordOverride : loginPassword;
    const email = rawEmail.trim().toLowerCase();
    const password = rawPassword.trim();

    if (!email || !password) {
      setLoginError('Enter both email ID and password.');
      return;
    }

    if (!email.includes('@')) {
      setLoginError('Use a valid email ID.');
      return;
    }

    try {
      const response = await loginUser(email, password);
      const nextRole = response.user.role.toLowerCase() as Role;
      const nextSession = {
        email: response.user.email,
        role: nextRole,
        token: response.token,
      };

      await writeStoredSession(nextSession);
      setSession(nextSession);
      setRole(nextRole);
      setScreen(roleHome[nextRole]);
      setLoginError('');
      setLoginPassword('');
    } catch (error: any) {
      setLoginError(error.message || 'Authentication failed.');
    }
  };

  const handleRegister = async (data: {
    name: string;
    email: string;
    password: string;
    rollNumber: string;
    messId: string;
  }) => {
    const response = await registerUser(data);
    const user = response.user || {};
    const nextRole = (user.role ? user.role.toLowerCase() : 'student') as Role;
    const nextSession = {
      email: user.email || data.email,
      role: nextRole,
      token: response.token,
    };

    await writeStoredSession(nextSession);
    setSession(nextSession);
    setRole(nextRole);
    setScreen(roleHome[nextRole]);
    setLoginError('');
    setLoginPassword('');
  };

  const handleLogout = async () => {
    await clearStoredSession();
    setSession(null);
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
    setScreen('qr-scanner');
    setRole('student');
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        role,
        setRole,
        bootstrapping,
        loginEmail,
        setLoginEmail,
        loginPassword,
        setLoginPassword,
        loginError,
        setLoginError,
        screen,
        setScreen,
        handleLogin,
        handleRegister,
        handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}