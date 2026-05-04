import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useColorScheme, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './constants/ThemeContext';
import { lightColors, darkColors } from './constants/theme';
import { AuthProvider, useAuth } from './constants/AuthContext';

// Screens
import JournalScreen from './screens/JournalScreen';
import MoodTrackingScreen from './screens/MoodTrackingScreen';
import PromptsScreen from './screens/PromptsScreen';
import EntryDetailScreen from './screens/EntryDetailScreen';
import NewEntryScreen from './screens/NewEntryScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Authentication Stack (shown before login)
function AuthStack() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Journal Stack (shown after login)
function JournalStack() {
  const colors = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const headerForeground = isDark ? '#ffffff' : '#000000';

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: headerForeground,
        headerTitleStyle: {
          color: headerForeground,
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="JournalList" 
        component={JournalScreen}
        options={{ title: 'My Journal' }}
      />
      <Stack.Screen 
        name="NewEntry" 
        component={NewEntryScreen}
        options={{ title: 'New Entry' }}
      />
      <Stack.Screen 
        name="EntryDetail" 
        component={EntryDetailScreen}
        options={{ title: 'Entry Details' }}
      />
    </Stack.Navigator>
  );
}

// Main Tab Navigator (shown after login)
function MainTabs() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? darkColors : lightColors;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Journal') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Mood') {
            iconName = focused ? 'happy' : 'happy-outline';
          } else if (route.name === 'Prompts') {
            iconName = focused ? 'bulb' : 'bulb-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: scheme === 'dark' ? '#9ca3af' : 'gray',
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: scheme === 'dark' ? '#4f435c' : '#e5e7eb',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Journal" component={JournalStack} />
      <Tab.Screen name="Mood" component={MoodTrackingScreen} />
      <Tab.Screen name="Prompts" component={PromptsScreen} />
    </Tab.Navigator>
  );
}

// App Navigation Component (conditionally shows auth or main app)
function AppNavigation() {
  const { isLoggedIn, isLoading } = useAuth();
  const scheme = useColorScheme();

  if (isLoading) {
    // Show loading screen while checking auth status
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {isLoggedIn ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppNavigation />
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
