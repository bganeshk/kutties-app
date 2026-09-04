import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import HomeStack from './HomeStack';
import type { HomeStackParamList } from './HomeStack';
import SubItemScreen from '../screens/SubItemScreen';
import LandingScreen from '../screens/LandingScreen';
import TeacherDetailsScreen from '../screens/TeacherDetailsScreen';
import EmployeeDetailsScreen from '../screens/EmployeeDetailsScreen';
import StudentDetailsScreen from '../screens/StudentDetailsScreen';
import CourseDetailsScreen from '../screens/CourseDetailsScreen';
import CourseTimeTableDetailsScreen from '../screens/CourseTimeTableDetailsScreen';
import TeacherScheduleScreen from '../screens/TeacherScheduleScreen';
import HandbookDetailsScreen from '../screens/HandbookDetailsScreen';
import FeedbackDetailsScreen from '../screens/FeedbackDetailsScreen';
import { TeacherList, TeacherForm } from '../components/teachers';
import { EmployeeList, EmployeeForm } from '../components/employees';
import { StudentList, StudentForm } from '../components/student/students';
import { CourseList, CourseForm, CourseTimeTableList, CourseTimeTableForm } from '../components/course';
import { HandbookList, HandbookForm } from '../components/handbook';
import { FeedbackList, FeedbackForm } from '../components/feedback';
import TeacherAttendanceLogDetailsScreen from '../screens/TeacherAttendanceLogDetailsScreen';
import { TeacherAttendanceLogList, TeacherAttendanceLogForm } from '../components/teacherattendancelog';
import StudentHealthDetailsScreen from '../screens/StudentHealthDetailsScreen';
import { StudentHealthList, StudentHealthForm } from '../components/student/studenthealth';
import StudentFeeDetailsScreen from '../screens/StudentFeeDetailsScreen';
import FeePendingScreen from '../screens/FeePendingScreen';
import { StudentFeeList, StudentFeeForm } from '../components/student/studentfee';
import StaffPayDetailsScreen from '../screens/StaffPayDetailsScreen';
import { StaffPayList, StaffPayForm } from '../components/staffpay';
import StudentAttendanceLogDetailsScreen from '../screens/StudentAttendanceLogDetailsScreen';
import { StudentAttendanceLogList, StudentAttendanceLogForm } from '../components/student/studentattendancelog';
import { StudentDiaryList, StudentDiaryForm } from '../components/student/studentdiary';
import StudentDiaryDetailsScreen from '../screens/StudentDiaryDetailsScreen';
import { ParentNoteList, ParentNoteForm } from '../components/parentnote';
import ParentNoteDetailsScreen from '../screens/ParentNoteDetailsScreen';
import { StudentMarkSheetList, StudentMarkSheetForm } from '../components/student/studentmarksheet';
import StudentMarkSheetDetailsScreen from '../screens/StudentMarkSheetDetailsScreen';
import StudentProgressCardScreen from '../screens/StudentProgressCardScreen';
import { StudentActivityList, StudentActivityForm } from '../components/student/studactivity';
import StudentActivityDetailsScreen from '../screens/StudentActivityDetailsScreen';
import { StudentRatingList, StudentRatingDetail } from '../components/student/rating';
import { StudentObservationList, StudentObservationForm } from '../components/student/observation';

const Tab = createBottomTabNavigator();
const PRIMARY = '#C2185B';

// ── Generic sub-item tab (Teachers, Students) ─────────────────────────────
function makeTabStack(parentview: string, title: string) {
  const Stack = createNativeStackNavigator<HomeStackParamList>();
  return function TabStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="SubItems"
          component={SubItemScreen}
          initialParams={{ parentview, title }}
        />
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="TeacherList" component={TeacherList} />
        <Stack.Screen name="TeacherDetails" component={TeacherDetailsScreen} />
        <Stack.Screen name="TeacherForm" component={TeacherForm} />
        <Stack.Screen name="TeacherSchedule" component={TeacherScheduleScreen} />
        <Stack.Screen name="EmployeeList" component={EmployeeList} />
        <Stack.Screen name="EmployeeDetails" component={EmployeeDetailsScreen} />
        <Stack.Screen name="EmployeeForm" component={EmployeeForm} />
        <Stack.Screen name="StudentList" component={StudentList} />
        <Stack.Screen name="StudentDetails" component={StudentDetailsScreen} />
        <Stack.Screen name="StudentForm" component={StudentForm} />
        <Stack.Screen name="CourseList" component={CourseList} />
        <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} />
        <Stack.Screen name="CourseForm" component={CourseForm} />
        <Stack.Screen name="CourseTimeTableList" component={CourseTimeTableList} />
        <Stack.Screen name="CourseTimeTableDetails" component={CourseTimeTableDetailsScreen} />
        <Stack.Screen name="CourseTimeTableForm" component={CourseTimeTableForm} />
        <Stack.Screen name="HandbookList" component={HandbookList} />
        <Stack.Screen name="HandbookDetails" component={HandbookDetailsScreen} />
        <Stack.Screen name="HandbookForm" component={HandbookForm} />
        <Stack.Screen name="FeedbackList" component={FeedbackList} />
        <Stack.Screen name="FeedbackDetails" component={FeedbackDetailsScreen} />
        <Stack.Screen name="FeedbackForm" component={FeedbackForm} />
        <Stack.Screen name="TeacherAttendanceLogList" component={TeacherAttendanceLogList} />
        <Stack.Screen name="TeacherAttendanceLogDetails" component={TeacherAttendanceLogDetailsScreen} />
        <Stack.Screen name="TeacherAttendanceLogForm" component={TeacherAttendanceLogForm} />
        <Stack.Screen name="StudentHealthList" component={StudentHealthList} />
        <Stack.Screen name="StudentHealthDetails" component={StudentHealthDetailsScreen} />
        <Stack.Screen name="StudentHealthForm" component={StudentHealthForm} />
        <Stack.Screen name="StudentFeeList" component={StudentFeeList} />
        <Stack.Screen name="StudentFeeDetails" component={StudentFeeDetailsScreen} />
        <Stack.Screen name="StudentFeeForm" component={StudentFeeForm} />
        <Stack.Screen name="FeePending" component={FeePendingScreen} />
        <Stack.Screen name="StaffPayList" component={StaffPayList} />
        <Stack.Screen name="StaffPayDetails" component={StaffPayDetailsScreen} />
        <Stack.Screen name="StaffPayForm" component={StaffPayForm} />
        <Stack.Screen name="StudentAttendanceLogList" component={StudentAttendanceLogList} />
        <Stack.Screen name="StudentAttendanceLogDetails" component={StudentAttendanceLogDetailsScreen} />
        <Stack.Screen name="StudentAttendanceLogForm" component={StudentAttendanceLogForm} />
        <Stack.Screen name="StudentDiaryList" component={StudentDiaryList} />
        <Stack.Screen name="StudentDiaryDetails" component={StudentDiaryDetailsScreen} />
        <Stack.Screen name="StudentDiaryForm" component={StudentDiaryForm} />
        <Stack.Screen name="ParentNoteList" component={ParentNoteList} />
        <Stack.Screen name="ParentNoteDetails" component={ParentNoteDetailsScreen} />
        <Stack.Screen name="ParentNoteForm" component={ParentNoteForm} />
        <Stack.Screen name="StudentMarkSheetList"            component={StudentMarkSheetList} />
        <Stack.Screen name="StudentMarkSheetDetails"         component={StudentMarkSheetDetailsScreen} />
        <Stack.Screen name="StudentMarkSheetForm"            component={StudentMarkSheetForm} />
        <Stack.Screen name="StudentProgressCard"             component={StudentProgressCardScreen} />
        <Stack.Screen name="StudentActivityList"             component={StudentActivityList} />
        <Stack.Screen name="StudentActivityDetails"          component={StudentActivityDetailsScreen} />
        <Stack.Screen name="StudentActivityForm"             component={StudentActivityForm} />
        <Stack.Screen name="StudentRatingList"               component={StudentRatingList} />
        <Stack.Screen name="StudentRatingDetail"             component={StudentRatingDetail} />
        <Stack.Screen name="StudentObservationList"          component={StudentObservationList} />
        <Stack.Screen name="StudentObservationForm"          component={StudentObservationForm} />
      </Stack.Navigator>
    );
  };
}

// ── Dedicated Courses tab — opens Course dashboard as root ────────────────
function CoursesTabStack() {
  const Stack = createNativeStackNavigator<HomeStackParamList>();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Root: Course dashboard (same SubItems pattern as other tabs) */}
      <Stack.Screen
        name="SubItems"
        component={SubItemScreen}
        initialParams={{ parentview: 'Course', title: 'Course' }}
      />
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="CourseList" component={CourseList} />
      <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} />
      <Stack.Screen name="CourseForm" component={CourseForm} />
      <Stack.Screen name="CourseTimeTableList" component={CourseTimeTableList} />
      <Stack.Screen name="CourseTimeTableDetails" component={CourseTimeTableDetailsScreen} />
      <Stack.Screen name="CourseTimeTableForm" component={CourseTimeTableForm} />
      <Stack.Screen name="StudentList" component={StudentList} />
      <Stack.Screen name="StudentDetails" component={StudentDetailsScreen} />
      <Stack.Screen name="StudentForm" component={StudentForm} />
      <Stack.Screen name="TeacherDetails" component={TeacherDetailsScreen} />
    </Stack.Navigator>
  );
}

const TeachersStack = makeTabStack('Teachers', 'Teachers');
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
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Home', { screen: 'HomeMain' });
          },
        })}
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
        component={CoursesTabStack}
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
