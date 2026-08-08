import React, { useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { GlassCard, PrimaryButton, SectionTitle } from '../../components';
import { useThemePalette } from '../../context/ThemeContext';
import { useUiState } from '../../context/UiStateContext';
import { scanQrCode } from '../../api/student';

export default function QrScannerScreen() {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannedQr, setScannedQr] = useState<string | null>(null);
  const { processing, launchProcessing } = useUiState();
  // Debounce lock — prevents duplicate scans while a request is in flight
  const processingRef = useRef(false);

  if (!cameraPermission) {
    return (
      <View>
        <SectionTitle eyebrow="" title="Meal Scanner" subtitle="Loading camera permissions." />
        <GlassCard style={styles.scannerCard}>
          <View style={styles.permissionPanel}>
            <ActivityIndicator size="large" color={palette.emerald} />
            <Text style={styles.permissionTitle}>Checking camera access</Text>
          </View>
        </GlassCard>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View>
        <SectionTitle
          eyebrow=""
          title="Meal Scanner"
          subtitle="Camera access is required to scan the mess QR code."
        />
        <GlassCard style={styles.scannerCard}>
          <View style={styles.permissionPanel}>
            <Feather name="camera" size={28} color={palette.text} />
            <Text style={styles.permissionTitle}>Camera permission needed</Text>
            <Text style={styles.permissionCopy}>
              Allow the camera so the app can scan the mess QR code and claim your daily meal.
            </Text>
            <PrimaryButton
              label="Grant Camera Access"
              icon="camera"
              tone="emerald"
              onPress={requestCameraPermission}
            />
          </View>
        </GlassCard>
      </View>
    );
  }

  const handleQrScan = ({ data }: { data: string }) => {
    // Debounce: ignore if same QR or a request is in flight
    if (processingRef.current || scannedQr === data) return;
    setScannedQr(data);
    processingRef.current = true;

    launchProcessing('verify-meal', async () => {
      try {
        const response = await scanQrCode(data);
        Alert.alert('Meal Claimed', response.message || 'Meal verified successfully!');
      } catch (err: any) {
        Alert.alert('Verification Result', err.message || 'Failed to verify meal.');
      } finally {
        processingRef.current = false;
      }
    });
  };

  return (
    <View>
      <SectionTitle eyebrow="" title="Meal Scanner" subtitle="Scan the QR code at the mess counter to claim today's meal." />
      <GlassCard style={styles.scannerCard}>
        <View style={styles.cameraFrame}>
          <CameraView
            style={styles.cameraSurface}
            facing={'back' as CameraType}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={processing === 'verify-meal' ? undefined : handleQrScan}
          />
          <View style={styles.scannerReticle}>
            <View style={styles.reticleCornerTopLeft} />
            <View style={styles.reticleCornerTopRight} />
            <View style={styles.reticleCornerBottomLeft} />
            <View style={styles.reticleCornerBottomRight} />
            <View style={styles.reticlePulse} />
          </View>
          <View style={styles.cameraBottomSheet}>
            <Text style={styles.cameraLabel}>
              {processing === 'verify-meal' ? 'Verifying meal claim...' : 'Point at the mess QR code'}
            </Text>
            <Text style={styles.cameraSub}>
              The QR code is displayed at the mess counter by staff.
            </Text>
          </View>
        </View>
        <View style={styles.inlineActions}>
          <PrimaryButton label="Reset Scan" icon="refresh-cw" tone="violet" onPress={() => { setScannedQr(null); processingRef.current = false; }} />
        </View>
        {scannedQr ? (
          <View style={styles.scanResultCard}>
            <Text style={styles.scanResultLabel}>Last scanned data</Text>
            <Text style={styles.scanResultValue}>{scannedQr.length > 80 ? scannedQr.slice(0, 80) + '...' : scannedQr}</Text>
          </View>
        ) : null}
      </GlassCard>
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useThemePalette>) => StyleSheet.create({
  scannerCard: { minHeight: 420 },
  permissionPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  permissionTitle: { color: palette.text, fontSize: 18, fontWeight: '800' },
  permissionCopy: { color: palette.muted, textAlign: 'center', fontSize: 13, lineHeight: 19, maxWidth: 280, marginBottom: 14 },
  cameraFrame: { borderRadius: 26, overflow: 'hidden', backgroundColor: '#030712' },
  cameraSurface: { height: 320, backgroundColor: '#020617' },
  scannerReticle: { position: 'absolute', left: '50%', top: '50%', width: 178, height: 178, marginLeft: -89, marginTop: -89, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  reticlePulse: { position: 'absolute', width: 118, height: 118, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(16,185,129,0.7)', shadowColor: palette.emerald, shadowOpacity: 0.5, shadowRadius: 24 },
  reticleCornerTopLeft: { position: 'absolute', left: 8, top: 8, width: 34, height: 34, borderLeftWidth: 3, borderTopWidth: 3, borderColor: palette.emerald, borderTopLeftRadius: 18 },
  reticleCornerTopRight: { position: 'absolute', right: 8, top: 8, width: 34, height: 34, borderRightWidth: 3, borderTopWidth: 3, borderColor: palette.emerald, borderTopRightRadius: 18 },
  reticleCornerBottomLeft: { position: 'absolute', left: 8, bottom: 8, width: 34, height: 34, borderLeftWidth: 3, borderBottomWidth: 3, borderColor: palette.emerald, borderBottomLeftRadius: 18 },
  reticleCornerBottomRight: { position: 'absolute', right: 8, bottom: 8, width: 34, height: 34, borderRightWidth: 3, borderBottomWidth: 3, borderColor: palette.emerald, borderBottomRightRadius: 18 },
  cameraBottomSheet: { padding: 16, backgroundColor: 'rgba(9,9,11,0.9)' },
  cameraLabel: { color: palette.text, fontSize: 15, fontWeight: '800' },
  cameraSub: { color: palette.muted, fontSize: 12.5, marginTop: 6, lineHeight: 18 },
  inlineActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  scanResultCard: { marginTop: 14, padding: 14, borderRadius: 20, backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.16)' },
  scanResultLabel: { color: palette.muted, fontSize: 12, fontWeight: '700' },
  scanResultValue: { color: palette.text, fontSize: 13, marginTop: 6, fontFamily: Platform.select({ android: 'monospace', ios: 'Courier', default: 'monospace' }) },
});