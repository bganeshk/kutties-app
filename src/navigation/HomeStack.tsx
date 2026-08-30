import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import SubItemScreen from '../screens/SubItemScreen';
import LandingScreen from '../screens/LandingScreen';
import TeacherDetailsScreen from '../screens/TeacherDetailsScreen';
import EmployeeDetailsScreen from '../screens/EmployeeDetailsScreen';
import StudentDetailsScreen from '../screens/StudentDetailsScreen';
import CourseDetailsScreen from '../screens/CourseDetailsScreen';
import CourseTimeTableDetailsScreen from '../screens/CourseTimeTableDetailsScreen';
import TeacherScheduleScreen from '../screens/TeacherScheduleScreen';
import HandbookDetailsScreen from '../screens/HandbookDetailsScreen';
import { TeacherList, TeacherForm } from '../components/teachers';
import { HandbookList, HandbookForm } from '../components/handbook';
import { FeedbackList, FeedbackForm } from '../components/feedback';
import { EmployeeList, EmployeeForm } from '../components/employees';
import { StudentList, StudentForm } from '../components/students';
import { CourseList, CourseForm } from '../components/courses';
import { CourseTimeTableList, CourseTimeTableForm } from '../components/coursetimetable';
import type { TeacherModel } from '../db/models/teacher.model';
import type { EmployeeModel } from '../db/models/employee.model';
import type { StudentModel } from '../db/models/student.model';
import type { CourseModel } from '../db/models/course.model';
import type { CourseTimeTableModel } from '../db/models/coursetimetable.model';
import type { HandbookModel } from '../db/models/handbook.model';
import type { FeedbackModel } from '../db/models/feedback.model';
import FeedbackDetailsScreen from '../screens/FeedbackDetailsScreen';
import TeacherAttendanceLogDetailsScreen from '../screens/TeacherAttendanceLogDetailsScreen';
import { TeacherAttendanceLogList, TeacherAttendanceLogForm } from '../components/teacherattendancelog';
import type { TeacherAttendanceLogModel } from '../db/models/teacherattendancelog.model';

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
  StudentList: { initialSearch?: string } | undefined;
  StudentDetails: { item: StudentModel };
  StudentForm: { mode: 'add' | 'edit'; item?: StudentModel };
  CourseList: undefined;
  CourseDetails: { item: CourseModel };
  CourseForm: { mode: 'add' | 'edit'; item?: CourseModel };
  CourseTimeTableList: { initialCourse?: string } | undefined;
  CourseTimeTableDetails: { item: CourseTimeTableModel };
  CourseTimeTableForm: { mode: 'add' | 'edit'; item?: CourseTimeTableModel };
  TeacherSchedule: { teacherEmail?: string; teacherName?: string } | undefined;
  HandbookList: undefined;
  HandbookDetails: { item: HandbookModel };
  HandbookForm: { mode: 'add' | 'edit'; item?: HandbookModel };
  FeedbackList: undefined;
  FeedbackDetails: { item: FeedbackModel };
  FeedbackForm: { mode: 'add' | 'edit'; item?: FeedbackModel };
  TeacherAttendanceLogList: { teacherEmail?: string; teacherName?: string; headerTitle?: string; staffMode?: boolean } | undefined;
  TeacherAttendanceLogDetails: { item: TeacherAttendanceLogModel };
  TeacherAttendanceLogForm: { mode: 'add' | 'edit'; item?: TeacherAttendanceLogModel; staffMode?: boolean };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain"               component={HomeScreen} />
      <Stack.Screen name="SubItems"               component={SubItemScreen} />
      <Stack.Screen name="Landing"                component={LandingScreen} />
      <Stack.Screen name="TeacherList"            component={TeacherList} />
      <Stack.Screen name="TeacherDetails"         component={TeacherDetailsScreen} />
      <Stack.Screen name="TeacherForm"            component={TeacherForm} />
      <Stack.Screen name="EmployeeList"           component={EmployeeList} />
      <Stack.Screen name="EmployeeDetails"        component={EmployeeDetailsScreen} />
      <Stack.Screen name="EmployeeForm"           component={EmployeeForm} />
      <Stack.Screen name="StudentList"            component={StudentList} />
      <Stack.Screen name="StudentDetails"         component={StudentDetailsScreen} />
      <Stack.Screen name="StudentForm"            component={StudentForm} />
      <Stack.Screen name="CourseList"             component={CourseList} />
      <Stack.Screen name="CourseDetails"          component={CourseDetailsScreen} />
      <Stack.Screen name="CourseForm"             component={CourseForm} />
      <Stack.Screen name="CourseTimeTableList"    component={CourseTimeTableList} />
      <Stack.Screen name="CourseTimeTableDetails" component={CourseTimeTableDetailsScreen} />
      <Stack.Screen name="CourseTimeTableForm"    component={CourseTimeTableForm} />
      <Stack.Screen name="TeacherSchedule"        component={TeacherScheduleScreen} />
      <Stack.Screen name="HandbookList"                    component={HandbookList} />
      <Stack.Screen name="HandbookDetails"                 component={HandbookDetailsScreen} />
      <Stack.Screen name="HandbookForm"                    component={HandbookForm} />
      <Stack.Screen name="FeedbackList"    component={FeedbackList} />
      <Stack.Screen name="FeedbackDetails" component={FeedbackDetailsScreen} />
      <Stack.Screen name="FeedbackForm"    component={FeedbackForm} />
      <Stack.Screen name="TeacherAttendanceLogList"    component={TeacherAttendanceLogList} />
      <Stack.Screen name="TeacherAttendanceLogDetails" component={TeacherAttendanceLogDetailsScreen} />
      <Stack.Screen name="TeacherAttendanceLogForm"    component={TeacherAttendanceLogForm} />
    </Stack.Navigator>
  );
}
