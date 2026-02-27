import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { IconButton, useTheme } from 'react-native-paper';

import LibraryScreen from '../screens/LibraryScreen';
import ReaderScreen from '../screens/ReaderScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StatsScreen from '../screens/StatsScreen';
import BookDetailScreen from '../screens/BookDetailScreen';
import EpubReaderScreen from '../screens/EpubReaderScreen';
import PdfReaderScreen from '../screens/PdfReaderScreen';
import { Book } from '../types';

export type RootStackParamList = {
  MainTabs: undefined;
  Reader: { book: Book };
  BookDetail: { book: Book };
  EpubReader: { book: Book };
  PdfReader: { book: Book };
};

export type MainTabParamList = {
  Library: undefined;
  Categories: undefined;
  Stats: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      }}
    >
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconButton
              icon="book-open-variant"
              size={size}
              iconColor={color}
            />
          ),
          title: 'Library',
        }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="folder" size={size} iconColor={color} />
          ),
          title: 'Categories',
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="chart-bar" size={size} iconColor={color} />
          ),
          title: 'Statistics',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="cog" size={size} iconColor={color} />
          ),
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="BookDetail"
          component={BookDetailScreen}
          options={{ headerShown: true, title: 'Book Details' }}
        />
        <Stack.Screen
          name="EpubReader"
          component={EpubReaderScreen}
          options={{ headerShown: false, orientation: 'portrait' }}
        />
        <Stack.Screen
          name="PdfReader"
          component={PdfReaderScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
