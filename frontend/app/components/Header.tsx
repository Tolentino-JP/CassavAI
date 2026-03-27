import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

const C = {
  bg: '#0a1a0f',
  surface: '#132b1a',
  card: '#1a3522',
  accent: '#2dc270',
  accentDim: 'rgba(45,194,112,0.08)',
  accentGlow: 'rgba(45,194,112,0.18)',
  border: '#1f6f43',
  borderSoft: 'rgba(31,111,67,0.4)',
  text: '#e8f5ee',
  textDim: '#3d7a55',
};

export default function Header() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
  Animated.parallel([
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false, // ✅ required
    }),
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // ✅ required
    }),
  ]).start();

  const loop = Animated.loop(
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.3,
        duration: 1200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false, // ✅ opacity → supported
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
    ])
  );

  loop.start();
  return () => loop.stop();
}, []);

  return (
    <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.left}>
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/images/cassavai_logo.png')} style={styles.logo} />
          <Animated.View style={[styles.statusDot, { opacity: pulseAnim }]} />
        </View>

        <View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.text }}>
            Cassav<Text style={{ color: C.accent }}>AI</Text>
          </Text>
          <Text style={{ fontSize: 11, color: C.textDim }}>Leaf Disease Detection</Text>
        </View>
      </View>

      <Link href="/components/Analytics" asChild>
        <Pressable style={styles.menuBtn}>
          <View style={styles.menuLines}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </View>
        </Pressable>
      </Link>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surface, paddingHorizontal: 16 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoWrap: { width: 46, height: 46 },
  logo: { width: 46, height: 46, borderRadius: 13 },
  statusDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  menuBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center' },
  menuLines: { gap: 3 },
  menuLine: { width: 18, height: 2, backgroundColor: C.accent },
});