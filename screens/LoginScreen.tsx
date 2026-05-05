import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../constants/ThemeContext';
import { useAuth } from '../constants/AuthContext';

type Props = {
  navigation: any;
};

export default function LoginScreen({ navigation }: Props) {
  const colors = useTheme();
  const { login, register, skipLogin, hasRegisteredAccount, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Please enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      if (hasRegisteredAccount) {
        const result = await login(email, password);
        if (!result.success) {
          Alert.alert('Could not log in', result.message ?? 'Incorrect email or password.');
        }
      } else {
        const result = await register(email, password);
        if (!result.success) {
          Alert.alert('Could not create account', result.message ?? 'Please check your details.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    void skipLogin();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#648767" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.title}>{hasRegisteredAccount ? 'Login' : 'Create account'}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {hasRegisteredAccount
          ? 'Welcome back to Mindful Moments'
          : 'Choose an email and password for this device (stored locally).'}
      </Text>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            borderColor: colors.textMuted,
            color: colors.text,
          },
        ]}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!submitting}
      />

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            borderColor: colors.textMuted,
            color: colors.text,
          },
        ]}
        placeholder={hasRegisteredAccount ? 'Password' : 'Password (at least 8 characters)'}
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!submitting}
      />

      <TouchableOpacity
        style={[styles.loginButton, submitting && styles.loginButtonDisabled]}
        onPress={() => void handleSubmit()}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginButtonText}>
            {hasRegisteredAccount ? 'Log In' : 'Create account'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSkip} disabled={submitting}>
        <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip for now</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Welcome')} disabled={submitting}>
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
  loginButtonDisabled: {
    opacity: 0.7,
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
