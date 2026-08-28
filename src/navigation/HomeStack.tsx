import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import SubItemScreen from '../screens/SubItemScreen';
import LandingScreen from '../screens/LandingScreen';
import TeacherDetailsScreen from '../screens/TeacherDetailsScreen';
import EmployeeDetailsScreen from '../screens/EmployeeDetailsScreen';
import StudentDetailsScreen from '../screens/StudentDetailsScreen';
import { TeacherList, TeacherForm } from '../components/teachers';
import { EmployeeList, EmployeeForm } from '../components/employees';
import { StudentList, StudentForm } from '../components/students';
import type { TeacherModel } from '../db/models/teacher.model';
import type { EmployeeModel } from '../db/models/employee.model';
import type { StudentModel } from '../db/models/student.model';

export type HomeStackParamList = {
  HomeMain: undefined;
  SubItems: { parentview: string; title: string };
  Landing: { title: string; appviewsheet: string };
  TeacherList: undefined;
  TeacherDetails: { item: TeacherModel };
  TeacherForm: { mode: 'add' | 'edit'; item?: TeacherModel };
  EmployeeList: undefined;
  EmployeeDetails: { item: EmployeeModel };
  EmployeeForm: { mode: 'add' | 'edit'; item?: EmployeeModel };
  StudentList: undefined;
  StudentDetails: { item: StudentModel };
  StudentForm: { mode: 'add' | 'edit'; item?: StudentModel };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="SubItems" component={SubItemScreen} />
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="TeacherList" component={TeacherList} />
      <Stack.Screen name="TeacherDetails" component={TeacherDetailsScreen} />
      <Stack.Screen name="TeacherForm" component={TeacherForm} />
      <Stack.Screen name="EmployeeList" component={EmployeeList} />
      <Stack.Screen name="EmployeeDetails" component={EmployeeDetailsScreen} />
      <Stack.Screen name="EmployeeForm" component={EmployeeForm} />
      <Stack.Screen name="StudentList" component={StudentList} />
      <Stack.Screen name="StudentDetails" component={StudentDetailsScreen} />
      <Stack.Screen name="StudentForm" component={StudentForm} />
    </Stack.Navigator>
  );
}
