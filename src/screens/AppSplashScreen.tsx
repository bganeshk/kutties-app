import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const PRIMARY = '#C2185B';
const { width } = Dimensions.get('window');

interface Props {
  message?: string;
}

export default function AppSplashScreen({ message = 'Loading…' }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const fade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    // Pulse the logo ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Animated.View style={[styles.content, { opacity: fade }]}>
        {/* Logo ring */}
        <Animated.View style={[styles.ring, { transform: [{ scale: pulse }] }]}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>K</Text>
          </View>
        </Animated.View>

        <Text style={styles.appName}>Kutties</Text>
        <Text style={styles.tagline}>School Management</Text>
        <Text style={styles.taglineTxt}>Every child is created by God. As a teacher, you are serving God's creation. Treat them with gentleness and love.</Text>
        <Text style={styles.taglineTxt}>ഓരോ കുട്ടിയും ദൈവത്താൽ സൃഷ്ടിക്കപ്പെട്ടവരാണ്. ഒരു അധ്യാപകൻ എന്ന നിലയിൽ, നിങ്ങൾ ദൈവത്തിന്റെ സൃഷ്ടിയെയാണ് സേവിക്കുന്നത്. അവരോട് സൗമ്യതയോടും സ്നേഹത്തോടും കൂടി പെരുമാറുക.</Text>

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {[0, 1, 2].map((i) => (
            <BounceDot key={i} delay={i * 180} />
          ))}
        </View>
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
}

function BounceDot({ delay }: { delay: number }) {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, { toValue: -8, duration: 300, useNativeDriver: true }),
        Animated.timing(y, { toValue:  0, duration: 300, useNativeDriver: true }),
        Animated.delay(600 - delay),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.dot, { transform: [{ translateY: y }] }]} />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
  },
  content: { alignItems: 'center' },
  ring: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 28,
  },
  logoCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoText: { fontSize: 48, fontWeight: '800', color: '#fff' },
  appName: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4, marginBottom: 40 },
  taglineTxt: { textAlign: 'justify', fontSize: 13, fontWeight:'600', color: 'rgba(255,255,255,0.75)', margin: '5%', marginBottom: 5 },
  dotsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  message: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
});
