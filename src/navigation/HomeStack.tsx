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
import StudentHealthDetailsScreen from '../screens/StudentHealthDetailsScreen';
import { StudentHealthList, StudentHealthForm } from '../components/studenthealth';
import type { StudentHealthModel } from '../db/models/studenthealth.model';
import StudentFeeDetailsScreen from '../screens/StudentFeeDetailsScreen';
import FeePendingScreen from '../screens/FeePendingScreen';
import { StudentFeeList, StudentFeeForm } from '../components/studentfee';
import type { StudentFeeModel } from '../db/models/studentfee.model';
import StaffPayDetailsScreen from '../screens/StaffPayDetailsScreen';
import { StaffPayList, StaffPayForm } from '../components/staffpay';
import type { StaffPayModel } from '../db/models/staffpay.model';
import StudentAttendanceLogDetailsScreen from '../screens/StudentAttendanceLogDetailsScreen';
import { StudentAttendanceLogList, StudentAttendanceLogForm } from '../components/studentattendancelog';
import type { StudentAttendanceLogModel } from '../db/models/studentattendancelog.model';
import StudentDiaryDetailsScreen from '../screens/StudentDiaryDetailsScreen';
import { StudentDiaryList, StudentDiaryForm } from '../components/studentdiary';
import type { StudentDiaryModel } from '../db/models/studentdiary.model';
import ParentNoteDetailsScreen from '../screens/ParentNoteDetailsScreen';
import { ParentNoteList, ParentNoteForm } from '../components/parentnote';
import type { ParentNoteModel } from '../db/models/parentnote.model';

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
  TeacherAttendanceLogList: { teacherEmail?: string; teacherName?: string; headerTitle?: string; staffMode?: boolean; leaveMode?: boolean } | undefined;
  TeacherAttendanceLogDetails: { item: TeacherAttendanceLogModel };
  TeacherAttendanceLogForm: { mode: 'add' | 'edit'; item?: TeacherAttendanceLogModel; staffMode?: boolean };
  StudentHealthList: { studentEmail?: string; studentName?: string; headerTitle?: string } | undefined;
  StudentHealthDetails: { item: StudentHealthModel };
  StudentHealthForm: { mode: 'add' | 'edit'; item?: StudentHealthModel; prefilledEmail?: string };
  StudentFeeList: { studentRegNumber?: string; studentName?: string; headerTitle?: string; prefilledRegNumber?: string } | undefined;
  StudentFeeDetails: { item: StudentFeeModel };
  StudentFeeForm: { mode: 'add' | 'edit'; item?: StudentFeeModel; prefilledRegNumber?: string };
  FeePending: { headerTitle?: string } | undefined;
  StaffPayList: { staffEmail?: string; staffName?: string; headerTitle?: string } | undefined;
  StaffPayDetails: { item: StaffPayModel };
  StaffPayForm: { mode: 'add' | 'edit'; item?: StaffPayModel; prefilledStaff?: string };
  StudentAttendanceLogList: { studentRegNumber?: string; studentName?: string; headerTitle?: string } | undefined;
  StudentAttendanceLogDetails: { item: StudentAttendanceLogModel };
  StudentAttendanceLogForm: { mode: 'add' | 'edit'; item?: StudentAttendanceLogModel; prefilledRegNumber?: string };
  StudentDiaryList: { studentRegNumber?: string; studentName?: string; headerTitle?: string } | undefined;
  StudentDiaryDetails: { item: StudentDiaryModel };
  StudentDiaryForm: { mode: 'add' | 'edit'; item?: StudentDiaryModel; prefilledRegNumber?: string };
  ParentNoteList: { studentRegNumber?: string; studentName?: string; headerTitle?: string } | undefined;
  ParentNoteDetails: { item: ParentNoteModel };
  ParentNoteForm: { mode: 'add' | 'edit' | 'acknowledge'; item?: ParentNoteModel; prefilledRegNumber?: string };
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
      <Stack.Screen name="StudentHealthList"           component={StudentHealthList} />
      <Stack.Screen name="StudentHealthDetails"        component={StudentHealthDetailsScreen} />
      <Stack.Screen name="StudentHealthForm"           component={StudentHealthForm} />
      <Stack.Screen name="StudentFeeList"              component={StudentFeeList} />
      <Stack.Screen name="StudentFeeDetails"           component={StudentFeeDetailsScreen} />
      <Stack.Screen name="StudentFeeForm"              component={StudentFeeForm} />
      <Stack.Screen name="FeePending"                  component={FeePendingScreen} />
      <Stack.Screen name="StaffPayList"                    component={StaffPayList} />
      <Stack.Screen name="StaffPayDetails"                 component={StaffPayDetailsScreen} />
      <Stack.Screen name="StaffPayForm"                    component={StaffPayForm} />
      <Stack.Screen name="StudentAttendanceLogList"        component={StudentAttendanceLogList} />
      <Stack.Screen name="StudentAttendanceLogDetails"     component={StudentAttendanceLogDetailsScreen} />
      <Stack.Screen name="StudentAttendanceLogForm"        component={StudentAttendanceLogForm} />
      <Stack.Screen name="StudentDiaryList"                component={StudentDiaryList} />
      <Stack.Screen name="StudentDiaryDetails"             component={StudentDiaryDetailsScreen} />
      <Stack.Screen name="StudentDiaryForm"                component={StudentDiaryForm} />
      <Stack.Screen name="ParentNoteList"                  component={ParentNoteList} />
      <Stack.Screen name="ParentNoteDetails"               component={ParentNoteDetailsScreen} />
      <Stack.Screen name="ParentNoteForm"                  component={ParentNoteForm} />
    </Stack.Navigator>
  );
}
