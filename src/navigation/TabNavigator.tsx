import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import HomeStack from './HomeStack';
import SubItemScreen from '../screens/SubItemScreen';
import LandingScreen from '../screens/LandingScreen';

const Tab = createBottomTabNavigator();
const PRIMARY = '#C2185B';

// Each tab gets its own Stack instance so drill-down works independently
function makeTabStack(parentview: string, title: string) {
  const Stack = createNativeStackNavigator();
  return function TabStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="SubItems"
          component={SubItemScreen}
          initialParams={{ parentview, title }}
        />
        <Stack.Screen name="Landing" component={LandingScreen} />
      </Stack.Navigator>
    );
  };
}

const TeachersStack = makeTabStack('Teachers', 'Teachers');
const CoursesStack  = makeTabStack('Course', 'Course');
const StudentsStack = makeTabStack('Students', 'Students');

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.55)',
        tabBarStyle: {
          backgroundColor: PRIMARY,
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Teachers"
        component={TeachersStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Courses"
        component={CoursesStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Students"
        component={StudentsStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="people" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
