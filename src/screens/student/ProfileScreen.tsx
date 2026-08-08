import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard, Pill, ReceiptBadge, SectionTitle, SkeletonBlock } from '../../components';
import { ErrorState } from '../../components/ErrorState';
import { useStudent } from '../../hooks/useStudent';
import { useThemePalette } from '../../context/ThemeContext';

export default function ProfileScreen() {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const { profile, loading, error, refetch } = useStudent();

  if (loading) {
    return renderSkeletonFeed('Profile', 3);
  }

  if (error || !profile) {
    return (
      <View>
        <SectionTitle eyebrow="" title="Student Profile" />
        <ErrorState message={error || 'Failed to load profile'} onRetry={refetch} />
      </View>
    );
  }

  const initials = (profile.name || 'S')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View>
      <SectionTitle eyebrow="" title="Student Profile" />
      <GlassCard>
        <View style={styles.profileHead}>
          <View style={styles.avatarRing}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileSub}>
              {profile.role} • {profile.passStatus}
            </Text>
          </View>
          <Pill label="Active" tone="emerald" icon="check-circle" />
        </View>
        <View style={styles.profileStats}>
          <ReceiptBadge label="Balance" value={profile.balanceDisplay} />
          <ReceiptBadge label="Days remaining" value={profile.daysRemainingDisplay} />
          <ReceiptBadge label="Wallet" value={profile.walletStatus} />
        </View>
      </GlassCard>
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
  profileHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatarRing: { width: 64, height: 64, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: palette.text, fontWeight: '900', fontSize: 20 },
  profileName: { color: palette.text, fontWeight: '900', fontSize: 20 },
  profileSub: { color: palette.muted, fontSize: 12.5, marginTop: 4 },
  profileStats: { flexDirection: 'row', justifyContent: 'flex-start', gap: 10, flexWrap: 'wrap' },
});
