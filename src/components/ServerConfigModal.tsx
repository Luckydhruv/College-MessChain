import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemePalette } from '../context/ThemeContext';
import { getBackendUrl, setBackendUrl, getDefaultBackendUrl } from '../utils/storage';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ServerConfigModal({ visible, onClose }: Props) {
  const palette = useThemePalette();
  const modalStyles = React.useMemo(() => createModalStyles(palette), [palette]);
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);

  useEffect(() => {
    if (visible) {
      setSaved(false);
      setTestResult(null);
      getBackendUrl().then(setUrl);
    }
  }, [visible]);

  const handleSave = async () => {
    setSaving(true);
    await setBackendUrl(url.trim());
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleReset = async () => {
    const defaultUrl = getDefaultBackendUrl();
    setUrl(defaultUrl);
    await setBackendUrl(defaultUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const testUrl = url.trim().replace(/\/+$/, '');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(testUrl, { signal: controller.signal });
      clearTimeout(timeout);
      setTestResult(res.ok ? 'success' : 'fail');
    } catch {
      setTestResult('fail');
    }
    setTesting(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={modalStyles.overlay}
      >
        <Pressable style={modalStyles.backdrop} onPress={onClose} />
        <View style={modalStyles.card}>
          {/* Header */}
          <View style={modalStyles.header}>
            <View style={modalStyles.iconWrap}>
              <Feather name="server" size={18} color={palette.emerald} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.title}>Server Configuration</Text>
              <Text style={modalStyles.subtitle}>
                Set the backend URL so you don't need to rebuild
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => [modalStyles.closeBtn, pressed && { opacity: 0.6 }]}>
              <Feather name="x" size={18} color={palette.muted} />
            </Pressable>
          </View>

          {/* URL input */}
          <Text style={modalStyles.label}>Backend URL</Text>
          <TextInput
            style={modalStyles.input}
            value={url}
            onChangeText={(t) => { setUrl(t); setTestResult(null); setSaved(false); }}
            placeholder="http://192.168.x.x:3000"
            placeholderTextColor={palette.softMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            selectTextOnFocus
          />
          <Text style={modalStyles.hint}>
            Default: {getDefaultBackendUrl()}
          </Text>

          {/* Test result */}
          {testResult === 'success' && (
            <View style={[modalStyles.resultBadge, { backgroundColor: 'rgba(16,185,129,0.14)' }]}>
              <Feather name="check-circle" size={14} color={palette.emerald} />
              <Text style={[modalStyles.resultText, { color: palette.emerald }]}>
                Server reachable!
              </Text>
            </View>
          )}
          {testResult === 'fail' && (
            <View style={[modalStyles.resultBadge, { backgroundColor: 'rgba(239,68,68,0.14)' }]}>
              <Feather name="alert-circle" size={14} color={palette.red} />
              <Text style={[modalStyles.resultText, { color: palette.red }]}>
                Cannot reach server. Check URL and ensure backend is running.
              </Text>
            </View>
          )}
          {saved && (
            <View style={[modalStyles.resultBadge, { backgroundColor: 'rgba(16,185,129,0.14)' }]}>
              <Feather name="check" size={14} color={palette.emerald} />
              <Text style={[modalStyles.resultText, { color: palette.emerald }]}>Saved!</Text>
            </View>
          )}

          {/* Actions */}
          <View style={modalStyles.actions}>
            <Pressable
              onPress={handleTest}
              disabled={testing || !url.trim()}
              style={({ pressed }) => [modalStyles.btn, modalStyles.testBtn, pressed && { opacity: 0.8 }]}
            >
              {testing ? (
                <ActivityIndicator size="small" color={palette.sky} />
              ) : (
                <Feather name="wifi" size={14} color={palette.sky} />
              )}
              <Text style={[modalStyles.btnText, { color: palette.sky }]}>Test</Text>
            </Pressable>

            <Pressable
              onPress={handleReset}
              style={({ pressed }) => [modalStyles.btn, modalStyles.resetBtn, pressed && { opacity: 0.8 }]}
            >
              <Feather name="rotate-ccw" size={14} color={palette.amber} />
              <Text style={[modalStyles.btnText, { color: palette.amber }]}>Default</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={saving || !url.trim()}
              style={({ pressed }) => [modalStyles.btn, modalStyles.saveBtn, pressed && { opacity: 0.8 }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color={palette.text} />
              ) : (
                <Feather name="save" size={14} color={palette.text} />
              )}
              <Text style={[modalStyles.btnText, { color: palette.text }]}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createModalStyles = (palette: ReturnType<typeof useThemePalette>) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },

  card: {
    width: '88%',
    maxWidth: 420,
    backgroundColor: palette.elevated,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(16,185,129,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.22)',
  },
  title: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  closeBtn: {
    padding: 4,
  },
  label: {
    color: '#d4d4d8',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '700',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: palette.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
  },
  hint: {
    color: palette.softMuted,
    fontSize: 11,
    marginTop: 6,
    marginBottom: 14,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 14,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  btnText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  testBtn: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderColor: 'rgba(56,189,248,0.2)',
  },
  resetBtn: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.2)',
  },
  saveBtn: {
    backgroundColor: 'rgba(16,185,129,0.22)',
    borderColor: 'rgba(16,185,129,0.34)',
  },
});
