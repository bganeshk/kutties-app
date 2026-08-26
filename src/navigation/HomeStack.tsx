import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import SubItemScreen from '../screens/SubItemScreen';
import LandingScreen from '../screens/LandingScreen';
import { TeacherList, TeacherForm } from '../components/teachers';
import { EmployeeList, EmployeeForm } from '../components/employees';
import type { TeacherModel } from '../db/models/teacher.model';
import type { EmployeeModel } from '../db/models/employee.model';

export type HomeStackParamList = {
  HomeMain: undefined;
  SubItems: { parentview: string; title: string };
  Landing: { title: string; appviewsheet: string };
  TeacherList: undefined;
  TeacherForm: { mode: 'add' | 'view' | 'edit'; item?: TeacherModel };
  EmployeeList: undefined;
  EmployeeForm: { mode: 'add' | 'view' | 'edit'; item?: EmployeeModel };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="SubItems" component={SubItemScreen} />
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="TeacherList" component={TeacherList} />
      <Stack.Screen name="TeacherForm" component={TeacherForm} />
      <Stack.Screen name="EmployeeList" component={EmployeeList} />
      <Stack.Screen name="EmployeeForm" component={EmployeeForm} />
    </Stack.Navigator>
  );
}
