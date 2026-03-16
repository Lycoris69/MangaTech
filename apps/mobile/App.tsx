import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Search, Library, Download } from 'lucide-react-native';
import * as Font from 'expo-font';
import { 
  Orbitron_400Regular,
  Orbitron_700Bold,
  Orbitron_900Black 
} from '@expo-google-fonts/orbitron';
import {
  Rajdhani_300Light,
  Rajdhani_400Regular,
  Rajdhani_500Medium,
  Rajdhani_600SemiBold,
  Rajdhani_700Bold
} from '@expo-google-fonts/rajdhani';
import * as SplashScreen from 'expo-splash-screen';

import { HomeScreen } from './src/screens/HomeScreen';
import { SeriesDetailsScreen } from './src/screens/SeriesDetailsScreen';
import { ReaderScreen } from './src/screens/ReaderScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { DownloadManagerScreen } from './src/screens/DownloadManagerScreen';
import { COLORS, FONTS } from './src/constants/theme';

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Home') return <Home size={size} color={color} />;
          if (route.name === 'Search') return <Search size={size} color={color} />;
          if (route.name === 'Library') return <Library size={size} color={color} />;
          if (route.name === 'Downloads') return <Download size={size} color={color} />;
          return null;
        },
        tabBarActiveTintColor: COLORS.primaryBright,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.cardBg,
          borderTopColor: COLORS.primary,
          borderTopWidth: 1,
          paddingBottom: 5,
        },
        headerStyle: {
          backgroundColor: COLORS.background,
          borderBottomColor: COLORS.primary,
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          fontFamily: FONTS.heading,
          color: COLORS.text,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Downloads" component={DownloadManagerScreen} />
    </Tab.Navigator>
  );
}

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.background,
    card: COLORS.cardBg,
    text: COLORS.text,
    border: COLORS.primary,
    primary: COLORS.primaryBright,
  },
};

export default function App() {
  const [fontsLoaded] = Font.useFonts({
    Orbitron_400Regular,
    Orbitron_700Bold,
    Orbitron_900Black,
    Rajdhani_300Light,
    Rajdhani_400Regular,
    Rajdhani_500Medium,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold
  });

  const onLayoutRootView = React.useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <NavigationContainer theme={CustomDarkTheme} onReady={onLayoutRootView}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background }
        }}
      >
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="SeriesDetails" component={SeriesDetailsScreen} />
        <Stack.Screen name="Reader" component={ReaderScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
