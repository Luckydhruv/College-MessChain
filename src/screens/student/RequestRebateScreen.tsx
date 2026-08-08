import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';

import { GlassCard, PrimaryButton, SectionTitle, TextField } from '../../components';
import { useUiState } from '../../context/UiStateContext';
import { requestRebate } from '../../api/student';
import { useThemePalette } from '../../context/ThemeContext';

export default function RequestRebateScreen() {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const [fromDateStr, setFromDateStr] = useState('');
  const [toDateStr, setToDateStr] = useState('');

  const { processing, launchProcessing } = useUiState();

  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const applyPreset = (days: number) => {
    const start = new Date();
    start.setDate(start.getDate() + 1); // tomorrow
    const end = new Date();
    end.setDate(end.getDate() + 1 + days);
    setFromDateStr(formatDate(start));
    setToDateStr(formatDate(end));
  };

  const handleSubmit = () => {
    if (!fromDateStr.trim() || !toDateStr.trim()) {
      Alert.alert('Required Fields', 'Please enter both From and To dates (YYYY-MM-DD).');
      return;
    }

    const fromTime = new Date(`${fromDateStr.trim()}T00:00:00Z`).getTime();
    const toTime = new Date(`${toDateStr.trim()}T23:59:59Z`).getTime();

    if (isNaN(fromTime) || isNaN(toTime)) {
      Alert.alert('Invalid Date Format', 'Please enter dates in YYYY-MM-DD format (e.g. 2026-08-10).');
      return;
    }

    const fromSec = Math.floor(fromTime / 1000);
    const toSec = Math.floor(toTime / 1000);
    const nowSec = Math.floor(Date.now() / 1000);

    if (fromSec <= nowSec) {
      Alert.alert('Future Date Required', 'Rebate From date must be in the future (e.g. tomorrow or later).');
      return;
    }

    if (toSec <= fromSec) {
      Alert.alert('Invalid Range', 'To date must be after From date.');
      return;
    }

    const maxDays = 15;
    if ((toSec - fromSec) / 86400 > maxDays) {
      Alert.alert('Exceeds Limit', `Maximum rebate duration is ${maxDays} days per request.`);
      return;
    }

    launchProcessing('request-rebate', async () => {
      try {
        await requestRebate(fromSec, toSec);
        Alert.alert('Rebate Requested', 'Your rebate claim has been submitted to admin for approval.');
        setFromDateStr('');
        setToDateStr('');
      } catch (err: any) {
        Alert.alert('Request Failed', err.message || 'Failed to submit rebate request.');
      }
    });
  };

  return (
    <View>
      <SectionTitle eyebrow="" title="Request Mess Rebate" subtitle="Submit leave of absence dates to receive token rebates." />
      <GlassCard>
        <Text style={styles.presetLabel}>Quick Date Presets</Text>
        <View style={styles.presetRow}>
          <Pressable style={styles.presetBtn} onPress={() => applyPreset(3)}>
            <Text style={styles.presetBtnText}>Next 3 Days</Text>
          </Pressable>
          <Pressable style={styles.presetBtn} onPress={() => applyPreset(7)}>
            <Text style={styles.presetBtnText}>Next 7 Days</Text>
          </Pressable>
          <Pressable style={styles.presetBtn} onPress={() => applyPreset(14)}>
            <Text style={styles.presetBtnText}>Next 14 Days</Text>
          </Pressable>
        </View>

        <TextField
          label="From Date (YYYY-MM-DD)"
          placeholder="e.g. 2026-08-10"
          value={fromDateStr}
          onChangeText={setFromDateStr}
        />
        <TextField
          label="To Date (YYYY-MM-DD)"
          placeholder="e.g. 2026-08-15"
          value={toDateStr}
          onChangeText={setToDateStr}
        />
        <View style={styles.hintBox}>
          <Text style={styles.hintTitle}>Rebate Guidelines</Text>
          <Text style={styles.hintBody}>
            Rebates must be scheduled at least 1 day in advance (max 15 days). Once approved by admin, meal tokens are credited back to your wallet.
          </Text>
        </View>
        <PrimaryButton
          label="Submit Rebate Request"
          icon="calendar"
          tone="emerald"
          onPress={handleSubmit}
          loading={processing === 'request-rebate'}
        />
      </GlassCard>
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useThemePalette>) => StyleSheet.create({
  presetLabel: { color: palette.text, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  presetBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  presetBtnText: { color: palette.emerald, fontSize: 12, fontWeight: '700' },
  hintBox: { marginVertical: 14, padding: 14, borderRadius: 18, backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.16)' },
  hintTitle: { color: palette.text, fontSize: 13, fontWeight: '800' },
  hintBody: { color: palette.muted, fontSize: 12, marginTop: 4, lineHeight: 18 },
});
