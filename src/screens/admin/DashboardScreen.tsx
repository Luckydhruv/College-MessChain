import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { GlassCard, Pill, SectionTitle } from '../../components';
import { ErrorState } from '../../components/ErrorState';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { useThemePalette } from '../../context/ThemeContext';

export default function DashboardScreen() {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const columns = width >= 980 ? 3 : width >= 720 ? 2 : 1;
  const { tiles, refetch } = useAdminDashboard();

  return (
    <View>
      <SectionTitle eyebrow="" title="Overview" />
      <View style={[styles.grid, { gap: 12 }]}>
        {tiles.map((tile) => (
          <GlassCard
            key={tile.label}
            style={[styles.metricCard, { width: columns === 1 ? '100%' : columns === 2 ? '48%' : '31.5%' }]}
          >
            <Text style={styles.metricLabel}>{tile.label}</Text>
            {tile.loading ? (
              <ActivityIndicator size="small" color={palette.emerald} style={{ marginTop: 8, marginBottom: 14 }} />
            ) : tile.error ? (
              <Text style={[styles.metricValue, { fontSize: 14, color: palette.red }]}>Failed to load</Text>
            ) : (
              <Text style={styles.metricValue}>{tile.value}</Text>
            )}
            {!tile.loading && !tile.error && (
              <Pill label="Live" tone="emerald" icon="activity" />
            )}
          </GlassCard>
        ))}
      </View>
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useThemePalette>) => StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: { minWidth: 0 },
  metricLabel: { color: palette.muted, fontSize: 12 },
  metricValue: { color: palette.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.8, marginTop: 8, marginBottom: 14 },
});
