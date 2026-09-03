import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import TabNavigator from './TabNavigator';
import { Colors } from '../styles/kutties-styles';

const Drawer = createDrawerNavigator();

const PRIMARY = Colors.primary;

// ── Drawer menu items ─────────────────────────────────────────────────────────
type DrawerItem = {
  label: string;
  icon: React.ReactNode;
  screen?: string;
};

const TOP_ITEMS: DrawerItem[] = [
  {
    label: 'Scan QR',
    icon: <MaterialCommunityIcons name="qrcode-scan" size={24} color="#555" />,
  },
  {
    label: 'Finance',
    icon: <MaterialCommunityIcons name="cash-multiple" size={24} color="#555" />,
  },
  {
    label: 'My Tasks',
    icon: <MaterialCommunityIcons name="checkbox-marked-outline" size={24} color="#555" />,
  },
  {
    label: 'User Role',
    icon: <MaterialCommunityIcons name="account-cog" size={24} color="#555" />,
  },
  {
    label: 'Assistant',
    icon: <MaterialCommunityIcons name="microphone" size={24} color="#555" />,
  },
];

const MIDDLE_ITEMS: DrawerItem[] = [
  {
    label: 'About',
    icon: <Ionicons name="information-circle" size={24} color="#555" />,
  },
  {
    label: 'Feedback',
    icon: <MaterialIcons name="feedback" size={24} color="#555" />,
  },
];

const BOTTOM_ITEMS: DrawerItem[] = [
  {
    label: 'App Gallery',
    icon: <MaterialIcons name="apps" size={24} color="#555" />,
  },
];

// ── Custom drawer content ─────────────────────────────────────────────────────
function CustomDrawerContent(props: DrawerContentComponentProps) {
  // Placeholder user — swap for real auth context when available
  const userEmail = 'bganeshk@gmail.com';
  const userInitial = userEmail.charAt(0).toUpperCase();

  function renderItem(item: DrawerItem, index: number) {
    return (
      <TouchableOpacity key={index} style={styles.menuItem} activeOpacity={0.7}>
        <View style={styles.menuIcon}>{item.icon}</View>
        <Text style={styles.menuLabel}>{item.label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.drawerRoot}>
      {/* Header */}
      <View style={styles.drawerHeader}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.appName}>KuttisAdmin</Text>
      </View>

      <View style={styles.divider} />

      {/* Scrollable menu */}
      <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
        {TOP_ITEMS.map((item, i) => renderItem(item, i))}

        <View style={styles.divider} />

        {MIDDLE_ITEMS.map((item, i) => renderItem(item, i + TOP_ITEMS.length))}

        <View style={styles.divider} />

        {BOTTOM_ITEMS.map((item, i) =>
          renderItem(item, i + TOP_ITEMS.length + MIDDLE_ITEMS.length),
        )}
      </ScrollView>

      {/* Footer: user + logout */}
      <View style={styles.drawerFooter}>
        <View style={styles.footerUser}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{userInitial}</Text>
          </View>
          <Text style={styles.userEmail} numberOfLines={1}>
            {userEmail}
          </Text>
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Exported drawer navigator ─────────────────────────────────────────────────
export default function AppDrawer() {
  return (
    <Drawer.Navigator
      id="Drawer"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: { width: '78%' },
        swipeEnabled: true,
      }}
    >
      <Drawer.Screen name="Main" component={TabNavigator} />
    </Drawer.Navigator>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  drawerRoot: { flex: 1, backgroundColor: '#fff' },

  // Header
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 18,
  },
  logoImage: { width: 48, height: 48, marginRight: 10 },
  appName: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E0E0E0', marginVertical: 4 },

  // Menu
  menuScroll: { flex: 1 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuIcon: { width: 32, alignItems: 'center', marginRight: 16 },
  menuLabel: { fontSize: 16, color: '#333', fontWeight: '400' },

  // Footer
  drawerFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  footerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  userEmail: { fontSize: 14, color: '#777', flex: 1 },
  logoutText: { fontSize: 16, fontWeight: '700', color: PRIMARY, textAlign: 'right' },
});
