import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { GlassCard, Pill, PrimaryButton, ReceiptBadge, SectionTitle, SkeletonBlock } from '../../components';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { useRebates } from '../../hooks/useRebates';
import { useUiState } from '../../context/UiStateContext';
import { useThemePalette } from '../../context/ThemeContext';

export default function RebatesScreen() {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const { rebates, loading, error, refetch, triggerApprove, triggerDeny } = useRebates();
  const { processing } = useUiState();

  if (loading) {
    return (
      <View>
        <SectionTitle eyebrow="" title="Rebate Queue" />
        {[1, 2, 3].map(i => (
          <GlassCard key={i} style={{ marginBottom: 12 }}>
            <SkeletonBlock height={18} width="62%" />
            <View style={{ height: 12 }} />
            <SkeletonBlock height={14} width="92%" />
          </GlassCard>
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <View>
        <SectionTitle eyebrow="" title="Rebate Queue" />
        <ErrorState message={error} onRetry={refetch} />
      </View>
    );
  }

  // Filter to show only pending rebates by default
  const pendingRebates = rebates.filter(r => r.status === 'Pending');

  if (pendingRebates.length === 0) {
    return (
      <View>
        <SectionTitle eyebrow="" title="Rebate Queue" />
        <EmptyState message="No pending rebate requests" icon="credit-card" />
      </View>
    );
  }

  return (
    <View>
      <SectionTitle eyebrow="" title="Rebate Queue" subtitle={`${pendingRebates.length} pending request${pendingRebates.length === 1 ? '' : 's'}`} />
      {pendingRebates.map((claim) => (
        <GlassCard key={claim.id} style={{ marginBottom: 12 }}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>
                {claim.student.startsWith('0x')
                  ? `${claim.student.slice(0, 8)}...${claim.student.slice(-6)}`
                  : claim.student}
              </Text>
              <Text style={styles.listBody}>
                {claim.fromDate} → {claim.toDate} ({claim.days} day{claim.days === 1 ? '' : 's'})
              </Text>
            </View>
            <Pill label={claim.status} tone={claim.status === 'Approved' ? 'emerald' : claim.status === 'Rejected' ? 'red' : 'amber'} icon="clock" />
          </View>
          <View style={styles.hashRow}>
            <ReceiptBadge label="Rebate ID" value={`#${claim.id}`} />
            {claim.requestedAt ? <ReceiptBadge label="Requested" value={claim.requestedAt} /> : null}
          </View>
          <View style={styles.inlineActions}>
            <PrimaryButton
              label="Approve"
              icon="check"
              tone="emerald"
              onPress={async () => {
                try {
                  await triggerApprove(claim.id);
                } catch (err: any) {
                  Alert.alert('Approval Failed', err.message || 'Failed to approve rebate.');
                }
              }}
              loading={processing === `rebate-${claim.id}`}
            />
            <PrimaryButton
              label="Reject"
              icon="x"
              tone="red"
              onPress={async () => {
                try {
                  await triggerDeny(claim.id);
                } catch (err: any) {
                  Alert.alert('Rejection Failed', err.message || 'Failed to reject rebate.');
                }
              }}
              loading={processing === `deny-${claim.id}`}
              danger
            />
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useThemePalette>) => StyleSheet.create({
  cardHeaderRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  listTitle: { color: palette.text, fontSize: 16, fontWeight: '800' },
  listBody: { color: palette.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  hashRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  inlineActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10, marginTop: 14, flexWrap: 'wrap' },
});