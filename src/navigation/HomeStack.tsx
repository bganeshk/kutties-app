import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import SubItemScreen from '../screens/SubItemScreen';
import LandingScreen from '../screens/LandingScreen';
import { TeacherList } from '../components/teachers';
import { EmployeeList } from '../components/employees';

export type HomeStackParamList = {
  HomeMain: undefined;
  SubItems: { parentview: string; title: string };
  Landing: { title: string; appviewsheet: string };
  TeacherList: undefined;
  EmployeeList: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="SubItems" component={SubItemScreen} />
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="TeacherList" component={TeacherList} />
      <Stack.Screen name="EmployeeList" component={EmployeeList} />
    </Stack.Navigator>
  );
}
