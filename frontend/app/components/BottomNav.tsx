import React, { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  bg: '#0a1a0f',
  surface: '#132b1a',
  card: '#1a3522',
  accent: '#2dc270',
  accentDim: 'rgba(45,194,112,0.08)',
  accentGlow: 'rgba(45,194,112,0.22)',
  border: '#1f6f43',
  borderSoft: 'rgba(31,111,67,0.4)',
  text: '#e8f5ee',
  textMuted: '#7ab893',
  textDim: '#3d7a55',
};

type BottomNavProps = {
  onBrowse: () => void;
  onCamera: () => void;
  onScan: () => void;
};

function NavAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.88,
      duration: 100,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      speed: 40,
      bounciness: 6,
      useNativeDriver: false,
    }).start();
  };
  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.navAction}>
      <Animated.View style={[styles.actionWrap, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.actionIconBox}>
          <Ionicons name={icon} size={19} color={C.accent} />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function ScanButton({ onPress }: { onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.92,
      duration: 100,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    Animated.timing(glowAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      speed: 35,
      bounciness: 8,
      useNativeDriver: false,
    }).start();

    Animated.timing(glowAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.scanPressable}>
      <Animated.View
        style={[
          styles.scanRing,
          {
            borderColor: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [C.border, C.accent],
            }),
            shadowOpacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.2, 0.7],
            }),
          },
        ]}
      >
        <Animated.View
          style={[
            styles.scanCore,
            {
              backgroundColor: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['#1a5c35', C.accent],
              }),
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Ionicons name="scan-outline" size={24} color={C.text} />
        </Animated.View>
      </Animated.View>
      <Text style={styles.scanLabel}>Scan</Text>
    </Pressable>
  );
}

export default function BottomNav({ onBrowse, onCamera, onScan }: BottomNavProps) {
  return (
    <View style={styles.nav}>
      <View style={styles.topEdge} />
      <View style={styles.inner}>
        <NavAction icon="image-outline" label="Gallery" onPress={onBrowse} />
        <ScanButton onPress={onScan} />
        <NavAction icon="camera-outline" label="Camera" onPress={onCamera} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { height: '110%', backgroundColor: C.surface },
  topEdge: {
    height: 1,
    backgroundColor: C.borderSoft,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  inner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 12 },
  navAction: { flex: 1, alignItems: 'center' },
  actionWrap: { alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12 },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.accentDim,
    borderWidth: 1,
    borderColor: C.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 11, color: C.textDim, fontWeight: '600', letterSpacing: 0.4 },
  scanPressable: { alignItems: 'center', gap: 4, marginTop: -6 },
  scanRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 10,
  },
  scanCore: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  scanLabel: { fontSize: 11, color: C.accent, fontWeight: '700', letterSpacing: 0.5 },
});