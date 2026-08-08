import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { GlassCard, MetricRing, SectionTitle } from '../../components';
import { useFeedback } from '../../hooks/useFeedback';
import { useThemePalette } from '../../context/ThemeContext';
import { ErrorState } from '../../components/ErrorState';

export default function FeedbackReportScreen() {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const columns = width >= 980 ? 2 : 1;

  const { feedbacks, loading, error, refetch, stats } = useFeedback();

  if (error) {
    return (
      <View>
        <SectionTitle eyebrow="" title="Feedback Report" />
        <ErrorState message={error} onRetry={refetch} />
      </View>
    );
  }

  const roundedScore = stats.averageRating > 0 ? Math.round((stats.averageRating / 5) * 100) : 0;

  return (
    <View>
      <SectionTitle eyebrow="" title="Feedback Report" subtitle={stats.coverageLabel} />
      <View style={[styles.grid, { gap: 12 }]}>
        <GlassCard style={[styles.reportCard, { width: columns === 1 ? '100%' : '48%' }]}>
          <MetricRing
            value={roundedScore}
            label={stats.averageRating > 0 ? `${stats.averageRating.toFixed(1)}/5 Stars` : 'No data'}
            accent={palette.emerald}
          />
          <Text style={styles.ringSub}>{stats.coverageLabel}</Text>
        </GlassCard>
        <GlassCard style={[styles.reportCard, { width: columns === 1 ? '100%' : '48%' }]}>
          <Text style={styles.chartTitle}>Recent Feedback</Text>
          {feedbacks.length === 0 ? (
            <Text style={styles.emptyText}>No feedback records found on backend.</Text>
          ) : (
            feedbacks.slice(0, 5).map((f) => (
              <View key={f.id} style={styles.feedbackRow}>
                <View style={styles.feedbackHead}>
                  <Text style={styles.feedbackStudent}>
                    {f.student.startsWith('0x') ? `${f.student.slice(0, 8)}...${f.student.slice(-6)}` : f.student}
                  </Text>
                  {f.parsed ? (
                    <Text style={styles.feedbackRating}>★ {f.parsed.rating}/5 ({f.parsed.window})</Text>
                  ) : null}
                </View>
                {f.content ? <Text style={styles.feedbackContent}>{f.content}</Text> : null}
                {f.timestamp ? <Text style={styles.feedbackDate}>{f.timestamp}</Text> : null}
              </View>
            ))
          )}
        </GlassCard>
      </View>
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useThemePalette>) => StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  reportCard: { minHeight: 240, padding: 18 },
  ringSub: { color: palette.muted, fontSize: 12, textAlign: 'center', marginTop: 12 },
  chartTitle: { color: palette.text, fontSize: 16, fontWeight: '800', marginBottom: 14 },
  emptyText: { color: palette.muted, fontSize: 13 },
  feedbackRow: { marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  feedbackHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feedbackStudent: { color: palette.text, fontSize: 13, fontWeight: '700' },
  feedbackRating: { color: palette.emerald, fontSize: 12.5, fontWeight: '800' },
  feedbackContent: { color: palette.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  feedbackDate: { color: palette.muted, fontSize: 10.5, marginTop: 4 },
});
