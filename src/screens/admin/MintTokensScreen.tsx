import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { GlassCard, PrimaryButton, SectionTitle, TextField } from '../../components';
import { NetworkContext } from '../../context/NetworkContext';
import { mintTokens } from '../../api/admin';
import { palette } from '../../theme';

export default function MintTokensScreen() {
  const [rollNumber, setRollNumber] = useState('');
  const [amountStr, setAmountStr] = useState('');

  const networkContext = useContext(NetworkContext);
  const { processing, launchProcessing } = networkContext || { processing: null, launchProcessing: (id: string, fn: any) => fn() };

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
      <SectionTitle eyebrow="Admin Console" title="Mint Tokens" subtitle="Issue meal tokens directly to a student wallet by roll number." />
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
          <Text style={styles.infoTitle}>On-Chain Token Issuance</Text>
          <Text style={styles.infoBody}>
            Minting issues ERC20 tokens directly onto the Besu consortium ledger to the student's designated wallet address.
          </Text>
        </View>
        <PrimaryButton
          label="Mint Tokens to Wallet"
          icon="plus-circle"
          tone="emerald"
          onPress={handleSubmit}
          loading={processing === 'mint-tokens'}
        />
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  infoBox: { marginVertical: 14, padding: 14, borderRadius: 18, backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.16)' },
  infoTitle: { color: palette.text, fontSize: 13, fontWeight: '800' },
  infoBody: { color: palette.muted, fontSize: 12, marginTop: 4, lineHeight: 18 },
});
