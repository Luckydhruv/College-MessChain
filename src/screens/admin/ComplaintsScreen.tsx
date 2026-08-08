import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GlassCard, PrimaryButton, ReceiptBadge, SectionTitle, SkeletonBlock, copyToClipboard } from '../../components';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { useComplaints } from '../../hooks/useComplaints';
import { useThemePalette } from '../../context/ThemeContext';

export default function ComplaintsScreen() {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const { complaints, loading, error, refetch } = useComplaints();
  const [revealComplaint, setRevealComplaint] = useState<string | null>(null);

  if (loading) {
    return renderSkeletonFeed('Complaints', 4);
  }

  if (error) {
    return (
      <View>
        <SectionTitle eyebrow="" title="Complaints" />
        <ErrorState message={error} onRetry={refetch} />
      </View>
    );
  }

  if (complaints.length === 0) {
    return (
      <View>
        <SectionTitle eyebrow="" title="Complaints" />
        <EmptyState message="No complaints filed yet" icon="message-square" />
      </View>
    );
  }

  return (
    <View>
      <SectionTitle eyebrow="" title="Complaints" subtitle={`${complaints.length} complaint${complaints.length === 1 ? '' : 's'} on record`} />
      {complaints.map((item) => {
        const expanded = revealComplaint === item.id;
        return (
          <GlassCard key={item.id} style={{ marginBottom: 12 }}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>Complaint #{item.id}</Text>
                <Text style={styles.listBody}>
                  {item.student.startsWith('0x')
                    ? `Student: ${item.student.slice(0, 8)}...${item.student.slice(-6)}`
                    : `Student: ${item.student}`}
                </Text>
                {item.timestamp ? <Text style={styles.listBody}>{item.timestamp}</Text> : null}
              </View>
            </View>
            <Pressable
              onPress={() => setRevealComplaint(expanded ? null : item.id)}
              style={styles.expandRow}
            >
              <Text style={styles.expandText}>
                {item.content
                  ? (expanded ? item.content : `${item.content.slice(0, 110)}${item.content.length > 110 ? '...' : ''}`)
                  : 'Content unavailable from IPFS'}
              </Text>
              <Feather
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={palette.muted}
              />
            </Pressable>
            <View style={styles.hashRow}>
              <ReceiptBadge
                label="IPFS CID"
                value={item.cid ? `${item.cid.slice(0, 10)}...${item.cid.slice(-8)}` : 'No CID'}
              />
              <PrimaryButton
                label="Copy CID"
                icon="copy"
                tone="violet"
                onPress={() => copyToClipboard(item.cid || '')}
              />
            </View>
          </GlassCard>
        );
      })}
    </View>
  );
}

function renderSkeletonFeed(title: string, blocks: number) {
  return (
    <View>
      <SectionTitle eyebrow="" title={title} />
      {[...Array(blocks)].map((_, index) => (
        <GlassCard key={index} style={{ marginBottom: 12 }}>
          <SkeletonBlock height={18} width="62%" />
          <View style={{ height: 12 }} />
          <SkeletonBlock height={14} width="92%" />
          <View style={{ height: 8 }} />
          <SkeletonBlock height={14} width="78%" />
        </GlassCard>
      ))}
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useThemePalette>) => StyleSheet.create({
  cardHeaderRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  listTitle: { color: palette.text, fontSize: 16, fontWeight: '800' },
  listBody: { color: palette.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  expandRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  expandText: { flex: 1, color: palette.muted, lineHeight: 20, fontSize: 13 },
  hashRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14 },
});