import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'react-native';
import { useTheme } from '../constants/ThemeContext';


type Props = {
  navigation: any;
};

export default function WelcomeScreen({ navigation }: Props) {
  const colors = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('Login');
    }, 4000);

    return () => clearTimeout(timer);
  }, [navigation]);

  const goToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.background }]}>
      <View style={[styles.logoContainer, {backgroundColor: '#648767' }]}>
  <Image
    source={require('../assets/images/logo.png')}
    style={styles.logo}
  />
</View>
    

      <Text style={styles.appName}>Mindful Moments</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Welcome</Text>
      <TouchableOpacity onPress={goToLogin} style={styles.skipWelcome}>
        <Text style={[styles.skipWelcomeText, { color: colors.journalButton }]}>Continue to sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
  width: 120,
  height: 120,
  borderRadius: 60,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 24,
},
logo: {
  width: 120,
  height: 120,
  resizeMode: 'contain',
  marginBottom: 24,
},
  /*
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  */
  logoText: {
    fontSize: 18,
    color: '#6b7280',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#648767',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
  },
  skipWelcome: {
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipWelcomeText: {
    fontSize: 16,
    fontWeight: '600',
  },
});