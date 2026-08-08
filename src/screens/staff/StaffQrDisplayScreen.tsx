import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import QRCodeSVG from 'react-native-qrcode-svg';
import { GlassCard, SectionTitle } from '../../components';
import { baseClient } from '../../api/client';
import { palette } from '../../theme';

export default function StaffQrDisplayScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchStaffProfile = async () => {
      try {
        const res = await baseClient.get<{ user: any }>('/api/staff/profile');
        if (active) {
          setProfile(res.user);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Failed to load staff profile');
          setLoading(false);
        }
      }
    };
    fetchStaffProfile();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <View style={styles.centerWrap}>
        <ActivityIndicator size="large" color={palette.emerald} />
        <Text style={styles.loadingText}>Loading mess verification QR...</Text>
      </View>
    );
  }

  if (error || !profile?.messId) {
    return (
      <View style={styles.centerWrap}>
        <Text style={styles.errorText}>{error || 'No mess assigned to this account'}</Text>
      </View>
    );
  }

  const qrPayload = JSON.stringify({
    type: 'MESS_VERIFICATION',
    messId: profile.messId,
  });

  return (
    <View>
      <SectionTitle eyebrow="Staff Operations" title="Mess Verification QR" />
      <GlassCard style={styles.card}>
        <Text style={styles.subtitle}>
          Display this QR code at the mess counter for students to scan and claim daily meals.
        </Text>
        <View style={styles.qrContainer}>
          <QRCodeSVG value={qrPayload} size={220} backgroundColor="#FFFFFF" color="#000000" />
        </View>
        <Text style={styles.messName}>{profile.mess?.name || 'Assigned Hostel Mess'}</Text>
        <Text style={styles.messIdText}>Mess ID: {profile.messId}</Text>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  centerWrap: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { color: palette.muted, marginTop: 12, fontSize: 14 },
  errorText: { color: palette.red, fontSize: 14, fontWeight: '700' },
  card: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  subtitle: { color: palette.muted, fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  qrContainer: { padding: 18, backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 18 },
  messName: { color: palette.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  messIdText: { color: palette.muted, fontSize: 12, fontFamily: 'monospace' },
});
