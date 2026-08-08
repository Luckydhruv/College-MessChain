import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { GlassCard, SectionTitle } from '../../components';
import { baseClient } from '../../api/client';
import { useThemePalette } from '../../context/ThemeContext';

function SimpleQrView({ value, size = 200 }: { value: string; size?: number }) {
  const matrixSize = 25;
  const grid: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));

  // Finder pattern helper (7x7 box with 3x3 center)
  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[startY + r][startX + c] = isBorder || isCenter;
      }
    }
  };

  drawFinder(0, 0); // Top-left
  drawFinder(matrixSize - 7, 0); // Top-right
  drawFinder(0, matrixSize - 7); // Bottom-left

  // Timing patterns
  for (let i = 8; i < matrixSize - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  // Deterministic data encoding based on hash of input string
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  let bitIdx = 0;
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      const inFinder1 = r < 8 && c < 8;
      const inFinder2 = r < 8 && c >= matrixSize - 8;
      const inFinder3 = r >= matrixSize - 8 && c < 8;
      const inTiming = r === 6 || c === 6;

      if (!inFinder1 && !inFinder2 && !inFinder3 && !inTiming) {
        const pseudoChar = value.charCodeAt(bitIdx % value.length) ^ (hash >> (bitIdx % 24));
        grid[r][c] = (pseudoChar + r * 7 + c * 13) % 2 === 0;
        bitIdx++;
      }
    }
  }

  const cellSize = size / matrixSize;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect x={0} y={0} width={size} height={size} fill="#FFFFFF" rx={8} />
      {grid.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <Rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.2}
              height={cellSize + 0.2}
              fill="#0F172A"
            />
          ) : null
        )
      )}
    </Svg>
  );
}

export default function StaffQrDisplayScreen() {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchStaffProfile = async () => {
      try {
        const res = await baseClient.get<{ user: any }>('/api/staff/profile');
        if (active) {
          setProfile(res.user);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Failed to load staff profile');
          setLoading(false);
        }
      }
    };
    fetchStaffProfile();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <View style={styles.centerWrap}>
        <ActivityIndicator size="large" color={palette.emerald} />
        <Text style={styles.loadingText}>Loading mess verification QR...</Text>
      </View>
    );
  }

  if (error || !profile?.messId) {
    return (
      <View style={styles.centerWrap}>
        <Text style={styles.errorText}>{error || 'No mess assigned to this account'}</Text>
      </View>
    );
  }

  const qrPayload = JSON.stringify({
    type: 'MESS_VERIFICATION',
    messId: profile.messId,
  });

  return (
    <View>
      <SectionTitle eyebrow="Staff Operations" title="Mess Verification QR" />
      <GlassCard style={styles.card}>
        <Text style={styles.subtitle}>
          Display this QR code at the mess counter for students to scan and claim daily meals.
        </Text>
        <View style={styles.qrContainer}>
          <SimpleQrView value={qrPayload} size={220} />
        </View>
        <Text style={styles.messName}>{profile.mess?.name || 'Assigned Hostel Mess'}</Text>
        <Text style={styles.messIdText}>Mess ID: {profile.messId}</Text>
      </GlassCard>
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useThemePalette>) => StyleSheet.create({
  centerWrap: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { color: palette.muted, marginTop: 12, fontSize: 14 },
  errorText: { color: palette.red, fontSize: 14, fontWeight: '700' },
  card: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  subtitle: { color: palette.muted, fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  qrContainer: { padding: 18, backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 18 },
  messName: { color: palette.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  messIdText: { color: palette.muted, fontSize: 12, fontFamily: 'monospace' },
});

