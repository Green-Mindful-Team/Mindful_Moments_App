import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
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

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const loginStatus = await AsyncStorage.getItem('userLoggedIn');
      setIsLoggedIn(loginStatus === 'true');
    } catch (error) {
      console.error('Error checking login status:', error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      await AsyncStorage.setItem('userLoggedIn', 'true');
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Error setting login status:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userLoggedIn');
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Error removing login status:', error);
    }
  };

  const value: AuthContextType = {
    isLoggedIn,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};