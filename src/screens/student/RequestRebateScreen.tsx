import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { GlassCard, PrimaryButton, SectionTitle, TextField } from '../../components';
import { NetworkContext } from '../../context/NetworkContext';
import { requestRebate } from '../../api/student';
import { palette } from '../../theme';

export default function RequestRebateScreen() {
  const [fromDateStr, setFromDateStr] = useState('');
  const [toDateStr, setToDateStr] = useState('');

  const networkContext = useContext(NetworkContext);
  const { processing, launchProcessing } = networkContext || { processing: null, launchProcessing: (id: string, fn: any) => fn() };

  const handleSubmit = () => {
    if (!fromDateStr.trim() || !toDateStr.trim()) {
      Alert.alert('Required Fields', 'Please enter both From and To dates (YYYY-MM-DD).');
      return;
    }

    const fromTime = new Date(fromDateStr.trim()).getTime();
    const toTime = new Date(toDateStr.trim()).getTime();

    if (isNaN(fromTime) || isNaN(toTime)) {
      Alert.alert('Invalid Date Format', 'Please enter dates in YYYY-MM-DD format (e.g. 2026-08-10).');
      return;
    }

    if (toTime < fromTime) {
      Alert.alert('Invalid Range', 'To date cannot be before From date.');
      return;
    }

    const fromSec = Math.floor(fromTime / 1000);
    const toSec = Math.floor(toTime / 1000);

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
      <SectionTitle eyebrow="Student Workspace" title="Request Mess Rebate" subtitle="Submit leave of absence dates to receive token rebates." />
      <GlassCard>
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
            Rebate claims must be submitted in advance. Upon admin approval, refund tokens will be minted to your wallet.
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

const styles = StyleSheet.create({
  hintBox: { marginVertical: 14, padding: 14, borderRadius: 18, backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.16)' },
  hintTitle: { color: palette.text, fontSize: 13, fontWeight: '800' },
  hintBody: { color: palette.muted, fontSize: 12, marginTop: 4, lineHeight: 18 },
});
