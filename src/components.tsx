import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { StyleProp } from 'react-native';
import { useTheme, useThemePalette } from './context/ThemeContext';
export { EmptyState } from './components/EmptyState';
export { ErrorState } from './components/ErrorState';

type BaseProps = { children: React.ReactNode; style?: StyleProp<ViewStyle> };


export const copyToClipboard = async (value: string) => {
  await Clipboard.setStringAsync(value);
};

export function GlassCard({ children, style }: BaseProps) {
  const { mode, colors } = useTheme();
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);

  return (
    <LinearGradient
      colors={mode === 'dark' ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'] : ['rgba(140,90,60,0.08)', 'rgba(255,248,240,0.86)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.cardOuter, { borderColor: colors.border, backgroundColor: mode === 'dark' ? 'rgba(24,24,27,0.72)' : colors.surface }, style]}
    >
      <BlurView intensity={mode === 'dark' ? 38 : 24} tint={mode === 'dark' ? 'dark' : 'light'} style={styles.cardBlur}>
        <View style={styles.cardInner}>{children}</View>
      </BlurView>
    </LinearGradient>
  );
}

export function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  const { colors } = useTheme();
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.eyebrow, { color: colors.secondaryText }]}>{eyebrow}</Text>
      <Text style={[styles.sectionHeading, { color: colors.primaryText }]}>{title}</Text>
      {subtitle ? <Text style={[styles.sectionBody, { color: colors.mutedText }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: 'neutral' | 'emerald' | 'violet' | 'amber' | 'red' | 'indigo'; icon?: keyof typeof Feather.glyphMap }) {
  const { colors } = useTheme();
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);

  const backgroundMap = {
    neutral: 'rgba(255,255,255,0.07)',
    emerald: 'rgba(16, 185, 129, 0.16)',
    violet: 'rgba(124, 58, 237, 0.16)',
    amber: 'rgba(245, 158, 11, 0.16)',
    red: 'rgba(239, 68, 68, 0.16)',
    indigo: 'rgba(79, 70, 229, 0.16)',
  } as const;

  const colorMap = {
    neutral: colors.primaryText,
    emerald: '#6ee7b7',
    violet: '#d8b4fe',
    amber: '#fcd34d',
    red: '#fca5a5',
    indigo: '#a5b4fc',
  } as const;

  return (
    <View style={[styles.pill, { backgroundColor: backgroundMap[tone] }]}>
      {icon ? <Feather name={icon} size={11} color={colorMap[tone]} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.pillText, { color: colorMap[tone] }]}>{label}</Text>
    </View>
  );
}

export function SegmentedControl({
  value,
  items,
  onChange,
}: {
  value: string;
  items: { id: string; label: string; helper?: string }[];
  onChange: (value: string) => void;
}) {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.segmentWrap}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <Pressable key={item.id} onPress={() => onChange(item.id)} style={({ pressed }) => [styles.segment, active && styles.segmentActive, pressed && { transform: [{ translateY: -1 }] }]}>
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{item.label}</Text>
            {item.helper ? <Text style={[styles.segmentHelper, active && styles.segmentHelperActive]}>{item.helper}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function PrimaryButton({
  label,
  icon,
  tone = 'emerald',
  onPress,
  loading,
  danger,
}: {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  tone?: 'emerald' | 'violet' | 'amber' | 'red';
  onPress: () => void;
  loading?: boolean;
  danger?: boolean;
}) {
  const { colors: themeColors } = useTheme();
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const gradientColors = {
    emerald: [themeColors.accent, themeColors.secondaryAccent],
    violet: [themeColors.secondaryText, themeColors.accent],
    amber: [themeColors.secondaryAccent, '#D97706'],
    red: ['rgba(239,68,68,0.98)', 'rgba(190,18,60,0.98)'],
  } as const;

  return (
    <Pressable onPress={onPress} disabled={loading} style={({ pressed }) => [styles.buttonOuter, pressed && !loading && { transform: [{ translateY: -2 }, { scale: 0.99 }] }, danger && styles.buttonDanger]}>
      <LinearGradient colors={gradientColors[tone]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buttonInner}>
        {loading ? <Feather name="loader" size={15} color={themeColors.buttonText} /> : icon ? <Feather name={icon} size={15} color={themeColors.buttonText} /> : null}
        <Text style={[styles.buttonText, { color: themeColors.buttonText }]}>{loading ? 'Processing' : label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

/**
 * Dedicated button for the Login screen (Sign In + Student/Staff/Admin
 * quick-access). Unlike `PrimaryButton`, this always pulls from
 * `theme.primaryButton` — the single brown token set defined in theme.ts —
 * so every login button renders identically instead of drifting across
 * different `tone` values (the bug that produced brown vs. blue-brown
 * buttons on the same screen).
 */
export function LoginButton({
  label,
  icon,
  onPress,
  loading,
}: {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  loading?: boolean;
}) {
  const { theme } = useTheme();
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const { primaryButton } = theme;

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.buttonOuter, pressed && !loading && { transform: [{ translateY: -2 }, { scale: 0.99 }] }]}
    >
      <LinearGradient
        colors={[primaryButton.background, primaryButton.backgroundAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.buttonInner, { borderWidth: 1, borderColor: primaryButton.border }]}
      >
        {loading ? <Feather name="loader" size={15} color={primaryButton.text} /> : icon ? <Feather name={icon} size={15} color={primaryButton.text} /> : null}
        <Text style={[styles.buttonText, { color: primaryButton.text }]}>{loading ? 'Processing' : label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function TextField({ label, placeholder, value, onChangeText, multiline, rows = 1, secureTextEntry, keyboardType, autoCapitalize = 'none' }: { label: string; placeholder: string; value: string; onChangeText: (text: string) => void; multiline?: boolean; rows?: number; secureTextEntry?: boolean; keyboardType?: TextInputProps['keyboardType']; autoCapitalize?: TextInputProps['autoCapitalize']; }) {
  const { colors } = useTheme();
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedText}
        multiline={multiline}
        numberOfLines={rows}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.primaryText }, multiline && { minHeight: 24 * rows + 20, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

export function ToggleRow({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  const { colors } = useTheme();
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);

  return (
    <Pressable onPress={() => onChange(!value)} style={[styles.toggleRow, { borderTopColor: colors.border }] }>
      <View style={{ flex: 1 }}>
        <Text style={[styles.toggleLabel, { color: colors.primaryText }]}>{label}</Text>
        <Text style={[styles.toggleDescription, { color: colors.mutedText }]}>{description}</Text>
      </View>
      <View style={[styles.switchTrack, { backgroundColor: value ? 'rgba(0,173,181,0.28)' : 'rgba(0,0,0,0.12)' }]}>
        <View style={[styles.switchKnob, value && styles.switchKnobOn]} />
      </View>
    </Pressable>
  );
}

export function SkeletonBlock({ width = '100%', height = 14, style }: { width?: number | `${number}%`; height?: number; style?: ViewStyle }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1150, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.48, 0.92, 0.48] });

  return <Animated.View style={[{ width: width as number | `${number}%`, height, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', opacity } as const, style]} />;
}

export function MetricRing({ value, label, accent }: { value: number; label: string; accent: string }) {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const size = 108;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringCopy}>
        <Text style={styles.ringValue}>{value}%</Text>
        <Text style={styles.ringLabel}>{label}</Text>
      </View>
    </View>
  );
}

export function LockClockIcon() {
  return (
    <Svg width={86} height={86} viewBox="0 0 86 86">
      <Circle cx={43} cy={43} r={38} fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.38)" strokeWidth={2} />
      <Circle cx={43} cy={43} r={28} fill="rgba(9,9,11,0.92)" stroke="rgba(255,255,255,0.14)" strokeWidth={2} />
      <Rect x={30} y={41} width={26} height={19} rx={6} fill="rgba(16,185,129,0.16)" stroke="#10b981" strokeWidth={2} />
      <Path d="M35 41v-6a8 8 0 0 1 16 0v6" stroke="#10b981" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Line x1={43} y1={47} x2={43} y2={31} stroke="#f8fafc" strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={43} y1={47} x2={52} y2={50} stroke="#f8fafc" strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={43} cy={43} r={2.8} fill="#f8fafc" />
    </Svg>
  );
}

export function ReceiptBadge({ label, value }: { label: string; value: string }) {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.receiptBadge}>
      <Text style={styles.receiptLabel}>{label}</Text>
      <Text style={styles.receiptValue}>{value}</Text>
    </View>
  );
}

export function BottomTab({ icon, label, active, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; active?: boolean; onPress: () => void }) {
  const { colors, theme } = useTheme();
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tabItem, active && styles.tabItemActive, { backgroundColor: active ? `${theme.bottomRowButton.background}24` : colors.surface, borderColor: active ? theme.bottomRowButton.background : colors.border }, pressed && { transform: [{ translateY: -2 }, { scale: 0.98 }] }]}>
      <Feather name={icon} size={17} color={active ? theme.bottomRowButton.background : colors.mutedText} />
      <Text style={[styles.tabText, active && styles.tabTextActive, { color: active ? colors.primaryText : colors.mutedText }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Sleek left-right toggle switch for switching between Dark Mode and Light Mode.
 * Meant to live in the top-right header area of the app shell.
 */
export function ThemeToggleSwitch() {
  const { isDark, toggleTheme, colors } = useTheme();
  const progress = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: isDark ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 90,
    }).start();
  }, [isDark, progress]);

  const knobTranslate = progress.interpolate({ inputRange: [0, 1], outputRange: [3, 27] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel="Toggle dark and light mode"
      onPress={toggleTheme}
      hitSlop={8}
      style={({ pressed }) => [
        themeToggleStyles.track,
        { backgroundColor: isDark ? 'rgba(0,173,181,0.22)' : 'rgba(140,90,60,0.18)', borderColor: colors.softBorder },
        pressed && { opacity: 0.86 },
      ]}
    >
      <View style={themeToggleStyles.iconRow}>
        <Feather name="sun" size={11} color={isDark ? colors.mutedText : colors.accent} />
        <Feather name="moon" size={11} color={isDark ? colors.accent : colors.mutedText} />
      </View>
      <Animated.View
        style={[
          themeToggleStyles.knob,
          { backgroundColor: colors.accent, transform: [{ translateX: knobTranslate }] },
        ]}
      >
        <Feather name={isDark ? 'moon' : 'sun'} size={12} color={colors.buttonText} />
      </Animated.View>
    </Pressable>
  );
}

const themeToggleStyles = StyleSheet.create({
  track: {
    width: 58,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  iconRow: {
    position: 'absolute',
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});

export interface FloatingNavTab {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

/**
 * Floating, curved, bottom navigation bar.
 * - Floats above the bottom bezel using safe-area insets + extra bottom margin.
 * - Never touches the left/right screen edges (horizontal margins).
 * - Square buttons that fill with the accent color when active.
 * - Falls back to horizontal scrolling if there are more than 5 tabs,
 *   while individual buttons keep their fixed square footprint.
 */
export function FloatingBottomNav({
  tabs,
  activeId,
  onChange,
  bottomInset = 0,
}: {
  tabs: readonly FloatingNavTab[];
  activeId: string;
  onChange: (id: string) => void;
  bottomInset?: number;
}) {
  const { colors, theme, isDark } = useTheme();
  const scale = useRef(tabs.map(() => new Animated.Value(1))).current;

  const animatePress = (index: number, toValue: number) => {
    Animated.spring(scale[index] ?? new Animated.Value(1), {
      toValue,
      useNativeDriver: true,
      friction: 6,
      tension: 140,
    }).start();
  };

  const canFit = tabs.length <= 5;

  return (
    <View pointerEvents="box-none" style={[navStyles.wrap, { bottom: 16 + bottomInset }]}>
      <View
        style={[
          navStyles.container,
          {
            backgroundColor: isDark ? 'rgba(30,30,30,0.94)' : 'rgba(232,223,202,0.96)',
            borderColor: colors.softBorder,
            shadowColor: isDark ? '#000' : '#8C5A3C',
          },
          !canFit && { paddingHorizontal: 8 },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!canFit}
          contentContainerStyle={[navStyles.row, canFit && navStyles.rowEven]}
        >
          {tabs.map((tab, index) => {
            const active = tab.id === activeId;
            return (
              <Animated.View key={tab.id} style={{ transform: [{ scale: scale[index] }] }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={tab.label}
                  onPress={() => onChange(tab.id)}
                  onPressIn={() => animatePress(index, 0.92)}
                  onPressOut={() => animatePress(index, 1)}
                  style={[
                    navStyles.button,
                    {
                      backgroundColor: active ? theme.bottomRowButton.background : 'transparent',
                      shadowColor: active ? theme.bottomRowButton.background : 'transparent',
                      shadowOpacity: active ? 0.45 : 0,
                    },
                  ]}
                >
                  <Feather
                    name={tab.icon}
                    size={20}
                    color={active ? theme.bottomRowButton.text : colors.mutedText}
                  />
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const navStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    overflow: 'visible',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowEven: {
    width: '100%',
    justifyContent: 'space-around',
  },
  button: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});

const createStyles = (palette: ReturnType<typeof useThemePalette>) => StyleSheet.create({
  cardOuter: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    overflow: 'hidden',
    backgroundColor: 'rgba(24,24,27,0.72)',
    shadowColor: '#000',
    shadowOpacity: 0.38,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  cardBlur: { flex: 1 },
  cardInner: { padding: 18 },
  sectionTitle: { marginBottom: 14 },
  eyebrow: { color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 1.6, fontSize: 11, marginBottom: 6 },
  sectionHeading: { color: palette.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.4 },
  sectionBody: { color: palette.muted, marginTop: 6, lineHeight: 20, fontSize: 13 },
  pill: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 12, fontWeight: '700' },
  statusWrap: { marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  statusLane: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  pulseDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: palette.emerald, shadowColor: palette.emerald, shadowOpacity: 0.9, shadowRadius: 10 },
  statusLabel: { color: palette.text, fontWeight: '800', fontSize: 12.5 },
  walletRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  walletMono: { color: '#e5e7eb', fontFamily: 'Courier', fontSize: 13, letterSpacing: 0.5 },
  copyButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  copyButtonText: { color: palette.text, fontWeight: '700', fontSize: 12 },
  statusSubcopy: { color: palette.muted, marginTop: 10, fontSize: 12 },
  segmentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segment: { flexGrow: 1, minWidth: 92, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  segmentActive: { backgroundColor: 'rgba(255,255,255,0.09)', borderColor: 'rgba(255,255,255,0.18)' },
  segmentLabel: { color: palette.muted, fontWeight: '800', fontSize: 13 },
  segmentLabelActive: { color: palette.text },
  segmentHelper: { color: '#6b7280', fontSize: 11, marginTop: 3 },
  segmentHelperActive: { color: '#cbd5e1' },
  buttonOuter: { borderRadius: 16, overflow: 'hidden', alignSelf: 'flex-start' },
  buttonDanger: { shadowColor: palette.red, shadowOpacity: 0.15 },
  buttonInner: { minHeight: 42, paddingHorizontal: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonText: { color: palette.text, fontWeight: '800', fontSize: 12.5 },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { color: '#d4d4d8', fontSize: 12, marginBottom: 8, fontWeight: '700' },
  field: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', color: palette.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  toggleLabel: { color: palette.text, fontWeight: '800', fontSize: 14 },
  toggleDescription: { color: palette.muted, marginTop: 4, fontSize: 12, lineHeight: 18 },
  switchTrack: { width: 52, height: 30, borderRadius: 999, padding: 3, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center' },
  switchTrackOn: { backgroundColor: 'rgba(16,185,129,0.34)' },
  switchKnob: { width: 24, height: 24, borderRadius: 999, backgroundColor: '#f8fafc' },
  switchKnobOn: { transform: [{ translateX: 22 }], backgroundColor: palette.text },
  ringWrap: { width: 108, height: 108, alignItems: 'center', justifyContent: 'center' },
  ringCopy: { position: 'absolute', alignItems: 'center' },
  ringValue: { color: palette.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  ringLabel: { color: palette.muted, fontSize: 11, marginTop: 2 },
  receiptBadge: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  receiptLabel: { color: palette.muted, fontSize: 11, marginBottom: 4 },
  receiptValue: { color: palette.text, fontWeight: '700', fontSize: 13 },
  tabItem: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tabItemActive: { backgroundColor: 'rgba(255,255,255,0.09)', borderColor: 'rgba(255,255,255,0.16)', transform: [{ translateY: -2 }] },
  tabText: { color: palette.muted, fontSize: 10, fontWeight: '700' },
  tabTextActive: { color: palette.text },
});
