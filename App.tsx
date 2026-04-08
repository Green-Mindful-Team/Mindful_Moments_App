import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Screens
import JournalScreen from './screens/JournalScreen';
import MoodTrackingScreen from './screens/MoodTrackingScreen';
import PromptsScreen from './screens/PromptsScreen';
import EntryDetailScreen from './screens/EntryDetailScreen';
import NewEntryScreen from './screens/NewEntryScreen';
import WelcomeScreen from './screens/WelcomeScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function JournalStack() {
  return (
    <Stack.Navigator>
    <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
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

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
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
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Journal" component={JournalStack} />
        <Tab.Screen name="Mood" component={MoodTrackingScreen} />
        <Tab.Screen name="Prompts" component={PromptsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
