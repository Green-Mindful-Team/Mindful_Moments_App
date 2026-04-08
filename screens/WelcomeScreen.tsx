import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'react-native';



type Props = {
  navigation: any;
};

export default function WelcomeScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('JournalList');
    }, 4000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
  <Image
    source={require('../assets/images/logo.png')}
    style={styles.logo}
  />
</View>
    

      <Text style={styles.appName}>Mindful Moments</Text>
      <Text style={styles.subtitle}>Welcome</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
  width: 120,
  height: 120,
  borderRadius: 60,
  backgroundColor: '#e5e7eb',
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
    color: '#6b7280',
  },
});