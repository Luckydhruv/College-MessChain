import React, { useContext, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ServerConfigModal from './src/components/ServerConfigModal';

import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { UiStateProvider } from './src/context/UiStateContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { adminTabs, studentTabs, staffTabs } from './src/theme';
import {
  FloatingBottomNav,
  GlassCard,
  LoginButton,
  SectionTitle,
  TextField,
  ThemeToggleSwitch,
} from './src/components';

import DashboardScreen from './src/screens/admin/DashboardScreen';
import StudentRosterScreen from './src/screens/admin/StudentRosterScreen';
import MintTokensScreen from './src/screens/admin/MintTokensScreen';
import MessChangesScreen from './src/screens/admin/MessChangesScreen';
import CreateStaffScreen from './src/screens/admin/CreateStaffScreen';
import ComplaintsScreen from './src/screens/admin/ComplaintsScreen';
import FeedbackReportScreen from './src/screens/admin/FeedbackReportScreen';
import RebatesScreen from './src/screens/admin/RebatesScreen';

import QrScannerScreen from './src/screens/student/QrScannerScreen';
import RequestRebateScreen from './src/screens/student/RequestRebateScreen';
import MessChangeScreen from './src/screens/student/MessChangeScreen';
import FileComplaintScreen from './src/screens/student/FileComplaintScreen';
import FileFeedbackScreen from './src/screens/student/FileFeedbackScreen';
import ProfileScreen from './src/screens/student/ProfileScreen';

import StaffQrDisplayScreen from './src/screens/staff/StaffQrDisplayScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

const roleTabs = { admin: adminTabs, student: studentTabs, staff: staffTabs } as const;
const roleMenus = {
  admin: ['dashboard', 'students', 'mint-tokens', 'mess-changes', 'complaints', 'feedback-report', 'rebates', 'create-staff'],
  student: ['qr-scanner', 'request-rebate', 'mess-change', 'file-complaint', 'file-feedback', 'profile'],
  staff: ['dashboard'],
} as const;

function AppContent() {
  const auth = useContext(AuthContext);
  const { colors, theme, isDark } = useTheme();

  if (!auth) {
    return null;
  }

  const {
    session,
    role,
    bootstrapping,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    loginError,
    screen,
    setScreen,
    handleLogin,
    handleLogout,
  } = auth;

  const [showServerConfig, setShowServerConfig] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const themeAwareStyles = createStyles(colors, theme);
  const contentWidth = width > 920 ? 860 : width - 32;
  const menu = roleMenus[role];
  const tabs = roleTabs[role];
  const authenticated = Boolean(session);

  const goToTab = (id: string) => {
    setScreen(id);
  };

  const handleQuickAccess = async (roleName: 'student' | 'staff' | 'admin') => {
    const quickCredentials: Record<'student' | 'staff' | 'admin', { email: string; password: string }> = {
      student: { email: 'student@messchain.com', password: 'student' },
      staff: { email: 'staff@messchain.com', password: 'staff' },
      admin: { email: 'admin@mess.edu', password: 'admin_strong_password' },
    };

    const target = quickCredentials[roleName];
    try {
      await handleLogin(target.email, target.password);
    } catch {
      if (roleName === 'admin') {
        // Fallback to legacy dev admin if seeded admin not available
        await handleLogin('admin@messchain.com', 'admin');
      }
    }
  };

  const renderRoute = (id: string) => {
    switch (id) {
      case 'dashboard':
        return role === 'staff' ? <StaffQrDisplayScreen /> : <DashboardScreen />;
      case 'students':
        return <StudentRosterScreen />;
      case 'mint-tokens':
        return <MintTokensScreen />;
      case 'mess-changes':
        return <MessChangesScreen />;
      case 'create-staff':
        return <CreateStaffScreen />;
      case 'complaints':
        return <ComplaintsScreen />;
      case 'feedback-report':
        return <FeedbackReportScreen />;
      case 'rebates':
        return <RebatesScreen />;
      case 'qr-scanner':
        return <QrScannerScreen />;
      case 'request-rebate':
        return <RequestRebateScreen />;
      case 'mess-change':
        return <MessChangeScreen />;
      case 'file-complaint':
        return <FileComplaintScreen />;
      case 'file-feedback':
        return <FileFeedbackScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return role === 'student' ? (
          <QrScannerScreen />
        ) : role === 'staff' ? (
          <StaffQrDisplayScreen />
        ) : (
          <DashboardScreen />
        );
    }
  };


  if (bootstrapping) {
    return (
      <SafeAreaView style={themeAwareStyles.safe}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={themeAwareStyles.themeToggleFloat}>
          <ThemeToggleSwitch />
        </View>
        <View style={themeAwareStyles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={themeAwareStyles.loadingTitle}>Loading secure session</Text>
          <Text style={themeAwareStyles.loadingCopy}>Restoring your last role before showing the app.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!authenticated) {
    return (
      <SafeAreaView style={themeAwareStyles.safe}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={themeAwareStyles.themeToggleFloatLogin}>
          <ThemeToggleSwitch />
        </View>
        <View style={themeAwareStyles.backdrop}>
          <View style={[themeAwareStyles.glowOrb, { backgroundColor: 'rgba(124,58,237,0.16)', top: -80, right: -50 }]} />
          <View style={[themeAwareStyles.glowOrb, { backgroundColor: 'rgba(79,70,229,0.18)', bottom: 70, left: -70 }]} />
          <View style={[themeAwareStyles.glowOrb, { backgroundColor: 'rgba(255,255,255,0.08)', top: 180, left: 80 }]} />
        </View>
        <ScrollView contentContainerStyle={themeAwareStyles.loginScroll} showsVerticalScrollIndicator={false}>
          <View style={[themeAwareStyles.brandMark, { borderColor: colors.accent }]}>
            <Feather name="hexagon" size={20} color={colors.accent} />
          </View>
          <Text style={themeAwareStyles.brandTitle}>MessChain</Text>
          <Text style={themeAwareStyles.brandSubtitle}>
            {isRegistering ? 'Create your institutional student account' : 'Log in with your Email ID and Password'}
          </Text>
          {isRegistering ? (
            <View style={{ width: contentWidth }}>
              <RegisterScreen onNavigateToLogin={() => setIsRegistering(false)} />
            </View>
          ) : (
            <GlassCard style={{ width: contentWidth, marginTop: 24 }}>
              <SectionTitle
                eyebrow="Welcome Back"
                title="Sign in to MessChain"
                subtitle="Enter your institutional credentials to continue"
              />
              <TextField
                label="Email ID"
                placeholder="admin@messchain.edu"
                value={loginEmail}
                onChangeText={setLoginEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextField
                label="Password"
                placeholder="Enter your password"
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry
              />
              {loginError ? <Text style={themeAwareStyles.loginError}>{loginError}</Text> : null}
              <View style={themeAwareStyles.loginActionRow}>
                <LoginButton
                  label="Sign In"
                  icon="log-in"
                  onPress={() => void handleLogin()}
                />
              </View>
              <Pressable
                onPress={() => setIsRegistering(true)}
                style={({ pressed }) => [themeAwareStyles.registerToggleBtn, pressed && { opacity: 0.78 }]}
              >
                <Text style={themeAwareStyles.registerToggleText}>New student? Create an account</Text>
              </Pressable>
              <View style={themeAwareStyles.quickAccessRow}>
                <LoginButton label="Student" icon="users" onPress={() => void handleQuickAccess('student')} />
                <LoginButton label="Staff" icon="briefcase" onPress={() => void handleQuickAccess('staff')} />
                <LoginButton label="Admin" icon="shield" onPress={() => void handleQuickAccess('admin')} />
              </View>
              <Pressable
                onPress={() => setShowServerConfig(true)}
                style={({ pressed }) => [themeAwareStyles.serverConfigBtn, pressed && { opacity: 0.78 }]}
              >
                <Feather name="server" size={14} color={colors.mutedText} />
                <Text style={themeAwareStyles.serverConfigText}>Configure Server IP</Text>
              </Pressable>
            </GlassCard>
          )}
          <ServerConfigModal visible={showServerConfig} onClose={() => setShowServerConfig(false)} />
        </ScrollView>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={themeAwareStyles.safe}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={themeAwareStyles.screenBg}>
        <View style={[themeAwareStyles.glowOrb, { backgroundColor: 'rgba(124,58,237,0.16)', top: -110, left: -60 }]} />
        <View style={[themeAwareStyles.glowOrb, { backgroundColor: 'rgba(79,70,229,0.18)', top: 120, right: -80 }]} />
      </View>

      <View style={[themeAwareStyles.shellHeaderWrap, { width: contentWidth, alignSelf: 'center' }]}>
        <View style={themeAwareStyles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={themeAwareStyles.shellTitle}>
              {role === 'admin' ? 'Admin Page' : role === 'student' ? 'Student Page' : 'Staff Page'}
            </Text>
            <Text style={themeAwareStyles.shellSub}>
              Signed in as {session?.email} • route: /{screen} • {menu.length} active modules
            </Text>
          </View>
          <View style={themeAwareStyles.shellActions}>
            <ThemeToggleSwitch />
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [themeAwareStyles.logoutButton, pressed && { opacity: 0.82, transform: [{ translateY: -1 }] }]}
            >
              <Feather name="log-out" size={14} color={colors.primaryText} />
              <Text style={themeAwareStyles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[themeAwareStyles.shellScroll, { paddingBottom: 140 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[themeAwareStyles.shellInner, { width: contentWidth }]}>
          <View style={themeAwareStyles.routeSurface}>{renderRoute(screen)}</View>
        </View>
      </ScrollView>

      <FloatingBottomNav tabs={tabs as any} activeId={screen} onChange={goToTab} bottomInset={insets.bottom} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <UiStateProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </UiStateProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  backdrop: { ...StyleSheet.absoluteFill },
  screenBg: { ...StyleSheet.absoluteFill },
  glowOrb: { position: 'absolute', width: 240, height: 240, borderRadius: 999, opacity: 0.7 },
  loginScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 42 },
  brandMark: { width: 60, height: 60, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  brandTitle: { color: colors.primaryText, fontSize: 34, fontWeight: '900', letterSpacing: -1, marginTop: 14 },
  brandSubtitle: { color: colors.mutedText, textAlign: 'center', maxWidth: 360, marginTop: 10, lineHeight: 22, fontSize: 14 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  loadingTitle: { color: colors.primaryText, fontSize: 18, fontWeight: '800' },
  loadingCopy: { color: colors.mutedText, textAlign: 'center', fontSize: 13, lineHeight: 19, maxWidth: 280 },
  loginError: { color: theme.danger, marginTop: 2, marginBottom: 8, fontSize: 12.5, fontWeight: '700' },
  loginActionRow: { marginTop: 18, gap: 10, alignItems: 'stretch' },
  quickAccessRow: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shellHeaderWrap: { paddingHorizontal: 12, paddingTop: 8 },
  shellScroll: { flexGrow: 1, paddingTop: 14, paddingHorizontal: 12, alignItems: 'center' },
  shellInner: { flex: 1, minWidth: 0 },
  themeToggleFloat: { position: 'absolute', top: 16, right: 16, zIndex: 20 },
  themeToggleFloatLogin: { position: 'absolute', top: 55, right: 16, zIndex: 20 },
  topBar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12, paddingTop: 8 },
  shellTitle: { color: colors.primaryText, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  shellSub: { color: colors.mutedText, marginTop: 4, fontSize: 12.5, flexShrink: 1, maxWidth: '100%' },
  shellActions: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-start' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 18, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.22)' },
  logoutText: { color: colors.primaryText, fontWeight: '800', fontSize: 12 },
  routeSurface: { width: '100%' },
  serverConfigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignSelf: 'center' },
  serverConfigText: { color: colors.mutedText, fontSize: 12.5, fontWeight: '700' },
  registerToggleBtn: { marginTop: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  registerToggleText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
});