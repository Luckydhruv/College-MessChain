import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';

import { GlassCard, PrimaryButton, SectionTitle, TextField } from '../../components';
import { useUiState } from '../../context/UiStateContext';
import { useComplaints } from '../../hooks/useComplaints';
import { useThemePalette } from '../../context/ThemeContext';

export default function FileComplaintScreen() {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintBody, setComplaintBody] = useState('');

  const { fileComplaint } = useComplaints();
  const { processing, launchProcessing } = useUiState();

  const handleSubmit = () => {
    if (!complaintTitle.trim() || !complaintBody.trim()) {
      Alert.alert('Required Fields', 'Please enter both complaint subject and detailed description.');
      return;
    }

    launchProcessing('submit-complaint', async () => {
      try {
        await fileComplaint(complaintTitle.trim(), complaintBody.trim());
        Alert.alert('Complaint Submitted', 'Your complaint has been submitted and stored on IPFS.');
        setComplaintTitle('');
        setComplaintBody('');
      } catch (err: any) {
        Alert.alert('Submission Error', err.message || 'Failed to submit complaint. Please check connection.');
      }
    });
  };

  return (
    <View>
      <SectionTitle eyebrow="" title="File a Complaint" subtitle="Submit formal complaints to mess administration." />

      <GlassCard>
        <TextField
          label="Complaint subject"
          placeholder="Service delay, food quality, or facility issue"
          value={complaintTitle}
          onChangeText={setComplaintTitle}
        />
        <TextField
          label="Describe the issue"
          placeholder="Explain what happened in a concise way."
          value={complaintBody}
          onChangeText={setComplaintBody}
          multiline
          rows={5}
        />
        <View style={styles.charCount}>
          <Text style={styles.charCountText}>{complaintBody.length}/320 characters</Text>
        </View>
        <View style={styles.inlineActions}>
          <PrimaryButton
            label="Submit Complaint"
            icon="send"
            tone="emerald"
            onPress={handleSubmit}
            loading={processing === 'submit-complaint'}
          />
        </View>
      </GlassCard>
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useThemePalette>) => StyleSheet.create({
  charCount: { marginBottom: 12 },
  charCountText: { color: palette.muted, fontSize: 12 },
  inlineActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10, marginTop: 14, flexWrap: 'wrap' },
});
