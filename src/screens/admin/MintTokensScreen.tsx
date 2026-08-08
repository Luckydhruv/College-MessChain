import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { GlassCard, PrimaryButton, SectionTitle, TextField } from '../../components';
import { useUiState } from '../../context/UiStateContext';
import { mintTokens } from '../../api/admin';
import { useThemePalette } from '../../context/ThemeContext';

export default function MintTokensScreen() {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const [rollNumber, setRollNumber] = useState('');
  const [amountStr, setAmountStr] = useState('');

  const { processing, launchProcessing } = useUiState();

  const handleSubmit = () => {
    if (!rollNumber.trim() || !amountStr.trim()) {
      Alert.alert('Required Fields', 'Please enter student roll number and token amount.');
      return;
    }

    const amount = Number(amountStr.trim());
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a positive numeric token amount.');
      return;
    }

    launchProcessing('mint-tokens', async () => {
      try {
        await mintTokens(rollNumber.trim(), amount);
        Alert.alert('Mint Successful', `Successfully minted ${amount} tokens for roll number ${rollNumber.trim()}!`);
        setRollNumber('');
        setAmountStr('');
      } catch (err: any) {
        Alert.alert('Mint Error', err.message || 'Failed to mint tokens.');
      }
    });
  };

  return (
    <View>
      <SectionTitle eyebrow="" title="Mint Tokens" subtitle="Issue meal tokens directly to a student wallet by roll number." />
      <GlassCard>
        <TextField
          label="Student Roll Number"
          placeholder="e.g. 21BCE1042"
          value={rollNumber}
          onChangeText={setRollNumber}
        />
        <TextField
          label="Token Amount"
          placeholder="e.g. 30"
          value={amountStr}
          onChangeText={setAmountStr}
          keyboardType="numeric"
        />
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Token Issuance</Text>
          <Text style={styles.infoBody}>
            Minting issues meal tokens directly to the student's designated wallet address for meal redemptions.
          </Text>
        </View>
        <PrimaryButton
          label="Mint Tokens"
          icon="plus-circle"
          tone="emerald"
          onPress={handleSubmit}
          loading={processing === 'mint-tokens'}
        />
      </GlassCard>
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useThemePalette>) => StyleSheet.create({
  infoBox: { marginVertical: 14, padding: 14, borderRadius: 18, backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.16)' },
  infoTitle: { color: palette.text, fontSize: 13, fontWeight: '800' },
  infoBody: { color: palette.muted, fontSize: 12, marginTop: 4, lineHeight: 18 },
});
