import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette } from '../theme';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
}

export function Toast({ message, type = 'success' }: ToastProps) {
  const isError = type === 'error';
  const icon = isError ? 'alert-circle' : type === 'success' ? 'check-circle' : 'info';
  const accentColor = isError ? palette.red : type === 'success' ? palette.emerald : palette.indigo;

  return (
    <View style={[styles.toast, { borderColor: accentColor, backgroundColor: `${accentColor}14` }]}>
      <Feather name={icon} size={18} color={accentColor} />
      <Text style={[styles.text, { color: palette.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
});
