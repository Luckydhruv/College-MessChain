import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { GlassCard, PrimaryButton, SectionTitle, TextField } from '../../components';
import { useUiState } from '../../context/UiStateContext';
import { createStaffMember } from '../../api/staff';
import { getPublicMesses, PublicMess } from '../../api/public';
import { useThemePalette } from '../../context/ThemeContext';

export default function CreateStaffScreen() {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [messId, setMessId] = useState('');
  const [messes, setMesses] = useState<PublicMess[]>([]);

  const { processing, launchProcessing } = useUiState();

  useEffect(() => {
    getPublicMesses()
      .then((res) => {
        setMesses(res);
        if (res.length > 0 && !messId) {
          setMessId(res[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleCreateStaff = () => {
    if (!staffName.trim() || !staffEmail.trim() || !staffPassword.trim() || !messId.trim()) {
      Alert.alert('Required Fields', 'Please enter employee name, email, password, and allocate a mess.');
      return;
    }

    launchProcessing('create-staff', async () => {
      try {
        await createStaffMember({
          name: staffName.trim(),
          email: staffEmail.trim(),
          password: staffPassword.trim(),
          messId: messId.trim(),
        });
        Alert.alert('Success', `Staff member ${staffName} created successfully!`);
        setStaffName('');
        setStaffEmail('');
        setStaffPassword('');
      } catch (err: any) {
        Alert.alert('Creation Failed', err.message || 'Failed to create staff profile.');
      }
    });
  };

  return (
    <View>
      <SectionTitle eyebrow="" title="Create Staff Member" subtitle="Onboard mess personnel with kitchen and scanning access." />
      <GlassCard>
        <TextField
          label="Employee Name"
          placeholder="John Doe"
          value={staffName}
          onChangeText={setStaffName}
        />
        <TextField
          label="Email Address"
          placeholder="staff@mess.edu"
          value={staffEmail}
          onChangeText={setStaffEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label="Password"
          placeholder="••••••••"
          value={staffPassword}
          onChangeText={setStaffPassword}
          secureTextEntry
        />

        <Text style={styles.pickerLabel}>Mess Allocation</Text>
        {messes.length > 0 ? (
          <View style={styles.messPicker}>
            {messes.map((m) => {
              const selected = messId === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setMessId(m.id)}
                  style={[styles.messOption, selected && styles.messOptionSelected]}
                >
                  <Text style={[styles.messOptionText, selected && styles.messOptionTextSelected]}>
                    {m.name}
                  </Text>
                  <Text style={styles.messOptionId} numberOfLines={1}>{m.id}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <TextField
            label="Mess ID Allocation"
            placeholder="Enter Mess Identifier string (e.g. 0x...)"
            value={messId}
            onChangeText={setMessId}
          />
        )}

        <View style={styles.inlineActions}>
          <PrimaryButton
            label="Create Staff Profile"
            icon="user-plus"
            tone="emerald"
            onPress={handleCreateStaff}
            loading={processing === 'create-staff'}
          />
        </View>
      </GlassCard>
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useThemePalette>) => StyleSheet.create({
  pickerLabel: { color: palette.muted, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  messPicker: { gap: 8, marginBottom: 14 },
  messOption: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  messOptionSelected: { backgroundColor: 'rgba(16,185,129,0.14)', borderColor: 'rgba(16,185,129,0.38)' },
  messOptionText: { color: palette.muted, fontSize: 13, fontWeight: '700' },
  messOptionTextSelected: { color: palette.text },
  messOptionId: { color: palette.muted, fontSize: 11, fontFamily: 'monospace', marginTop: 3 },
  inlineActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10, marginTop: 14, flexWrap: 'wrap' },
});