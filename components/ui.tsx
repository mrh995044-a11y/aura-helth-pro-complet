import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, shadow } from '../lib/theme';

export function PulseHeart({ size = 28 }: { size?: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.16, duration: 720, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.85, duration: 720, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 820, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.3, duration: 820, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow, scale]);
  return (
    <View style={{ width: size + 18, height: size + 18, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size + 16,
          height: size + 16,
          borderRadius: 99,
          backgroundColor: C.pink,
          opacity: glow,
        }}
      />
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name="heart" size={size} color={C.pink} />
      </Animated.View>
    </View>
  );
}

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flex: 1, backgroundColor: C.bg }, style]}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Txt({
  children,
  size = 15,
  color = C.text,
  weight = '500',
  style,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: '400' | '500' | '600' | '700' | '800';
  style?: object;
}) {
  return <Text style={[{ color, fontSize: size, fontWeight: weight, letterSpacing: -0.2 }, style]}>{children}</Text>;
}

export function Pill({ label, color = C.violet, bg }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={{ backgroundColor: bg || `${color}22`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Btn({
  label,
  onPress,
  icon,
  kind = 'primary',
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  kind?: 'primary' | 'ghost' | 'danger' | 'soft';
  disabled?: boolean;
  loading?: boolean;
}) {
  const bg = kind === 'primary' ? C.violetDeep : kind === 'danger' ? '#3A1522' : kind === 'soft' ? C.card3 : 'transparent';
  const fg = kind === 'danger' ? C.bad : kind === 'ghost' ? C.violet : C.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.86 : 1, borderWidth: kind === 'ghost' ? 1 : 0, borderColor: C.lineStrong },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={16} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboardType,
  right,
  autoCapitalize = 'none',
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  right?: React.ReactNode;
  autoCapitalize?: TextInputProps['autoCapitalize'];
}) {
  return (
    <View style={{ gap: 6 }}>
      <Txt size={12} color={C.muted} weight="600">
        {label}
      </Txt>
      <View style={styles.field}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.faint}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={styles.input}
        />
        {right}
      </View>
    </View>
  );
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Txt size={18} weight="800">
            {title}
          </Txt>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={C.muted} />
          </Pressable>
        </View>
        {children}
      </View>
    </Modal>
  );
}

export function Hero({ title, sub }: { title: string; sub?: string }) {
  return (
    <LinearGradient colors={['#2A1848', '#120C1E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <PulseHeart size={22} />
        <View style={{ flex: 1 }}>
          <Txt size={20} weight="800">
            {title}
          </Txt>
          {sub ? (
            <Txt size={13} color={C.muted} style={{ marginTop: 2 }}>
              {sub}
            </Txt>
          ) : null}
        </View>
      </View>
    </LinearGradient>
  );
}

export function Empty({ icon, title, sub }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
      <Ionicons name={icon} size={28} color={C.faint} />
      <Txt weight="700">{title}</Txt>
      {sub ? (
        <Txt size={13} color={C.muted} style={{ textAlign: 'center', maxWidth: 280 }}>
          {sub}
        </Txt>
      ) : null}
    </View>
  );
}

export function Bars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 46 }}>
      {values.map((v, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <View style={{ width: '100%', height: 36, justifyContent: 'flex-end' }}>
            <View
              style={{
                height: Math.max(3, (v / max) * 36),
                borderRadius: 5,
                backgroundColor: v ? color : C.card3,
                opacity: i === values.length - 1 ? 1 : 0.55,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    padding: 14,
    ...shadow,
  },
  btn: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  field: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { flex: 1, color: C.text, fontSize: 15, paddingVertical: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: C.bg2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 28,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: C.line,
  },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 4, backgroundColor: C.card3, marginBottom: 12 },
  hero: { borderRadius: 22, padding: 16, borderWidth: 1, borderColor: C.lineStrong },
});
