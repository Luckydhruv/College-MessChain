import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard, PrimaryButton, SectionTitle, SkeletonBlock, EmptyState, ErrorState } from '../../components';
import { useUiState } from '../../context/UiStateContext';
import { getMessChanges, approveMessChange, rejectMessChange, MessChangeRequest } from '../../api/admin';
import { useThemePalette } from '../../context/ThemeContext';

export default function MessChangesScreen() {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const [requests, setRequests] = useState<MessChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { processing, launchProcessing } = useUiState();

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMessChanges();
      // Filter pending requests (status === 0)
      setRequests(data.filter((r) => r.status === 0));
    } catch (err: any) {
      setError(err.message || 'Failed to load mess change requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = (id: number) => {
    launchProcessing(`approve-mc-${id}`, async () => {
      await approveMessChange(id);
      setRequests((curr) => curr.filter((r) => r.id !== id));
    });
  };

  const handleReject = (id: number) => {
    launchProcessing(`reject-mc-${id}`, async () => {
      await rejectMessChange(id);
      setRequests((curr) => curr.filter((r) => r.id !== id));
    });
  };

  if (loading) {
    return (
      <View>
        <SectionTitle eyebrow="" title="Mess Change Requests" />
        {[1, 2].map((i) => (
          <GlassCard key={i} style={{ marginBottom: 12 }}>
            <SkeletonBlock height={18} width="60%" />
            <View style={{ height: 10 }} />
            <SkeletonBlock height={14} width="85%" />
          </GlassCard>
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <View>
        <SectionTitle eyebrow="" title="Mess Change Requests" />
        <ErrorState message={error} onRetry={fetchRequests} />
      </View>
    );
  }

  return (
    <View>
      <SectionTitle eyebrow="" title="Mess Change Requests" subtitle={`Pending approval: ${requests.length}`} />
      {requests.length === 0 ? (
        <EmptyState icon="repeat" title="No Pending Requests" message="There are no pending mess change requests to review." />
      ) : (
        requests.map((item) => {
          const shortStudent = item.student ? `${item.student.substring(0, 10)}...` : 'Unknown Student';
          const shortMess = item.toMess ? `${item.toMess.substring(0, 10)}...` : 'Unknown Mess';
          return (
            <GlassCard key={item.id} style={{ marginBottom: 12 }}>
              <Text style={styles.cardTitle}>Request #{item.id}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaBlock}>
                  <Text style={styles.metaLabel}>Student</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>{shortStudent}</Text>
                </View>
                <View style={styles.metaBlock}>
                  <Text style={styles.metaLabel}>Requested Mess</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>{shortMess}</Text>
                </View>
              </View>
              <View style={styles.inlineActions}>
                <PrimaryButton
                  label="Approve"
                  icon="check"
                  tone="emerald"
                  onPress={() => handleApprove(item.id)}
                  loading={processing === `approve-mc-${item.id}`}
                />
                <PrimaryButton
                  label="Reject"
                  icon="x"
                  tone="red"
                  onPress={() => handleReject(item.id)}
                  loading={processing === `reject-mc-${item.id}`}
                  danger
                />
              </View>
            </GlassCard>
          );
        })
      )}
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useThemePalette>) => StyleSheet.create({
  cardTitle: { color: palette.text, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  metaBlock: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  metaLabel: { color: palette.muted, fontSize: 11, fontWeight: '700' },
  metaValue: { color: palette.text, fontSize: 13, fontWeight: '700', marginTop: 4, fontFamily: 'monospace' },
  inlineActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10, marginTop: 4, flexWrap: 'wrap' },
});
