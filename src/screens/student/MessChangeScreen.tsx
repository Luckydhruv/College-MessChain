import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { GlassCard, PrimaryButton, SectionTitle, SkeletonBlock } from '../../components';
import { useUiState } from '../../context/UiStateContext';
import { getPublicMesses, PublicMess } from '../../api/public';
import { requestMessChange, getStudentProfile } from '../../api/student';
import { useThemePalette } from '../../context/ThemeContext';

export default function MessChangeScreen() {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const [messes, setMesses] = useState<PublicMess[]>([]);
  const [currentMessId, setCurrentMessId] = useState<string | null>(null);
  const [selectedMessId, setSelectedMessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { processing, launchProcessing } = useUiState();

  useEffect(() => {
    Promise.all([
      getPublicMesses().catch(() => []),
      getStudentProfile().catch(() => null),
    ]).then(([messesList, profile]) => {
      setMesses(messesList);
      if (profile?.messId) {
        setCurrentMessId(profile.messId);
      }
      setLoading(false);
    });
  }, []);

  const handleSubmit = () => {
    if (!selectedMessId) {
      Alert.alert('Selection Required', 'Please select a new mess from the list.');
      return;
    }

    launchProcessing('request-mess-change', async () => {
      try {
        await requestMessChange(selectedMessId);
        Alert.alert('Request Submitted', 'Mess change request submitted! Awaiting admin approval.');
        setSelectedMessId(null);
      } catch (err: any) {
        Alert.alert('Request Failed', err.message || 'Failed to submit mess change request.');
      }
    });
  };

  if (loading) {
    return (
      <View>
        <SectionTitle eyebrow="" title="Request Mess Change" />
        <GlassCard>
          <SkeletonBlock height={20} width="60%" />
          <View style={{ height: 12 }} />
          <SkeletonBlock height={40} width="100%" />
        </GlassCard>
      </View>
    );
  }

  const availableMesses = messes.filter((m) => m.id !== currentMessId);

  return (
    <View>
      <SectionTitle eyebrow="" title="Request Mess Change" subtitle="Select a new dining hall to transfer your subscription." />
      <GlassCard>
        <Text style={styles.pickerLabel}>Choose Target Mess</Text>
        <View style={styles.messList}>
          {availableMesses.length === 0 ? (
            <Text style={styles.emptyText}>No alternative messes available.</Text>
          ) : (
            availableMesses.map((mess) => {
              const selected = selectedMessId === mess.id;
              return (
                <Pressable
                  key={mess.id}
                  onPress={() => setSelectedMessId(mess.id)}
                  style={[styles.messCard, selected && styles.messCardSelected]}
                >
                  <Text style={[styles.messName, selected && styles.messNameSelected]}>{mess.name}</Text>
                  <Text style={styles.messAddress} numberOfLines={1}>{mess.id}</Text>
                </Pressable>
              );
            })
          )}
        </View>
        <PrimaryButton
          label="Submit Change Request"
          icon="repeat"
          tone="violet"
          onPress={handleSubmit}
          loading={processing === 'request-mess-change'}
        />
      </GlassCard>
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useThemePalette>) => StyleSheet.create({
  pickerLabel: { color: palette.text, fontSize: 14, fontWeight: '800', marginBottom: 12 },
  messList: { gap: 10, marginBottom: 16 },
  messCard: { padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  messCardSelected: { backgroundColor: 'rgba(124,58,237,0.18)', borderColor: 'rgba(124,58,237,0.48)' },
  messName: { color: palette.muted, fontSize: 14, fontWeight: '800' },
  messNameSelected: { color: palette.text },
  messAddress: { color: palette.muted, fontSize: 11, fontFamily: 'monospace', marginTop: 4 },
  emptyText: { color: palette.muted, fontSize: 13 },
});
