import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hasStoredAccount,
  registerCredentials,
  verifyCredentials,
} from '../services/AuthCredentialsService';

const SESSION_KEY = 'userLoggedIn';

interface AuthContextType {
  isLoggedIn: boolean;
  hasRegisteredAccount: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  /** Opens the app without checking email/password (same device session flag only). */
  skipLogin: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRegisteredAccount, setHasRegisteredAccount] = useState(false);

  const refreshAccountFlag = useCallback(async () => {
    const exists = await hasStoredAccount();
    setHasRegisteredAccount(exists);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const [loginStatus, accountExists] = await Promise.all([
          AsyncStorage.getItem(SESSION_KEY),
          hasStoredAccount(),
        ]);
        setIsLoggedIn(loginStatus === 'true');
        setHasRegisteredAccount(accountExists);
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsLoggedIn(false);
        setHasRegisteredAccount(false);
      } finally {
        setIsLoading(false);
      }
    };
    void init();
  }, []);

  const setSession = async () => {
    await AsyncStorage.setItem(SESSION_KEY, 'true');
    setIsLoggedIn(true);
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    const result = await verifyCredentials(email, password);
    if (!result.ok) {
      return { success: false, message: result.message };
    }
    try {
      await setSession();
      return { success: true };
    } catch (error) {
      console.error('Error setting login status:', error);
      return { success: false, message: 'Could not save session. Please try again.' };
    }
  };

  const register = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    const result = await registerCredentials(email, password);
    if (!result.ok) {
      return { success: false, message: result.message };
    }
    try {
      await setSession();
      await refreshAccountFlag();
      return { success: true };
    } catch (error) {
      console.error('Error completing registration:', error);
      return { success: false, message: 'Could not save session. Please try again.' };
    }
  };

  const skipLogin = async () => {
    try {
      await setSession();
    } catch (error) {
      console.error('Error skipping login:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Error removing login status:', error);
    }
  };

  const value: AuthContextType = {
    isLoggedIn,
    hasRegisteredAccount,
    login,
    register,
    skipLogin,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
