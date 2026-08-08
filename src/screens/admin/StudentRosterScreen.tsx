import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard, SectionTitle, SkeletonBlock, EmptyState, ErrorState } from '../../components';
import { getStudents, StudentEntry } from '../../api/admin';
import { palette } from '../../theme';

export default function StudentRosterScreen() {
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoster = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load student roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  if (loading) {
    return (
      <View>
        <SectionTitle eyebrow="Admin Console" title="Student Directory" />
        {[1, 2, 3].map((i) => (
          <GlassCard key={i} style={{ marginBottom: 12 }}>
            <SkeletonBlock height={18} width="50%" />
            <View style={{ height: 8 }} />
            <SkeletonBlock height={14} width="80%" />
          </GlassCard>
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <View>
        <SectionTitle eyebrow="Admin Console" title="Student Directory" />
        <ErrorState message={error} onRetry={fetchRoster} />
      </View>
    );
  }

  return (
    <View>
      <SectionTitle eyebrow="Admin Console" title="Student Directory" subtitle={`Total registered students: ${students.length}`} />
      {students.length === 0 ? (
        <EmptyState icon="users" title="No Students Registered" message="No student records were returned from the backend." />
      ) : (
        students.map((student) => (
          <GlassCard key={student.id || student.rollNumber} style={{ marginBottom: 12 }}>
            <View style={styles.cardHeader}>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.rollBadge}>{student.rollNumber}</Text>
            </View>
            <Text style={styles.studentSub}>{student.email}</Text>
            <View style={styles.metaStrip}>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>Assigned Mess</Text>
                <Text style={styles.metaValue}>{student.messName}</Text>
              </View>
              <View style={[styles.metaBlock, { flex: 2 }]}>
                <Text style={styles.metaLabel}>Wallet Address</Text>
                <Text style={styles.walletMono} numberOfLines={1}>
                  {student.walletAddress || 'No Wallet'}
                </Text>
              </View>
            </View>
          </GlassCard>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  studentName: { color: palette.text, fontSize: 16, fontWeight: '800' },
  rollBadge: { color: palette.emerald, fontWeight: '800', fontSize: 13, backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  studentSub: { color: palette.muted, fontSize: 12.5 },
  metaStrip: { flexDirection: 'row', gap: 10, marginTop: 12 },
  metaBlock: { flex: 1, padding: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  metaLabel: { color: palette.muted, fontSize: 11, fontWeight: '700' },
  metaValue: { color: palette.text, fontSize: 13, fontWeight: '700', marginTop: 3 },
  walletMono: { color: palette.text, fontSize: 12, fontFamily: 'monospace', marginTop: 3 },
});
