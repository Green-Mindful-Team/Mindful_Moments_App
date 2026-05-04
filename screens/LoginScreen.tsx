import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../constants/ThemeContext';
import { useAuth } from '../constants/AuthContext';

type Props = {
  navigation: any;
};

export default function LoginScreen({ navigation }: Props) {
  const colors = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Please enter your email and password.');
      return;
    }

    // Set logged in status - this will trigger navigation to main app
    login();
  };

  const handleSkip = () => {
    // Allow user to skip login and go directly to main app
    login();
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <Text style={styles.title}>Login</Text>
      <Text style={[styles.subtitle, {color: colors.textMuted }]}>Welcome back to Mindful Moments</Text>

      <TextInput
        style={[styles.input, {backgroundColor: colors.background, borderColor: colors.textMuted, color: colors.text,}]}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={[styles.input, {backgroundColor: colors.background, borderColor: colors.textMuted, color: colors.text}]}
        placeholder="Password"
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>Log In</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSkip}>
        <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip for now</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Welcome')}>
        <Text style={[styles.introLink, { color: colors.textMuted }]}>View app intro</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#648767',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  loginButton: {
    height: 52,
    backgroundColor: '#648767',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipText: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 14,
  },
  introLink: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 13,
  },
});