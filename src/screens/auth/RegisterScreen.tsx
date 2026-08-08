import React, { useState, useEffect, useContext } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GlassCard, PrimaryButton, SectionTitle, TextField, SkeletonBlock, ErrorState, EmptyState } from '../../components';
import { AuthContext } from '../../context/AuthContext';
import { getPublicMesses, PublicMess } from '../../api/public';
import { useThemePalette } from '../../context/ThemeContext';

interface RegisterScreenProps {
  onNavigateToLogin?: () => void;
}

export default function RegisterScreen({ onNavigateToLogin }: RegisterScreenProps = {}) {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const auth = useContext(AuthContext);


  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [messId, setMessId] = useState('');

  const [messes, setMesses] = useState<PublicMess[]>([]);
  const [loadingMesses, setLoadingMesses] = useState(true);
  const [messError, setMessError] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadMesses = () => {
    setLoadingMesses(true);
    setMessError(null);
    getPublicMesses()
      .then((data) => {
        setMesses(data);
        if (data.length > 0) {
          setMessId(data[0].id);
        }
      })
      .catch((err: any) => {
        setMessError(err?.message || 'Failed to load mess list. Check your server connection.');
      })
      .finally(() => {
        setLoadingMesses(false);
      });
  };

  useEffect(() => {
    loadMesses();
  }, []);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Full name is required';
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      errors.email = 'Email address is required';
    } else if (!trimmedEmail.includes('@')) {
      errors.email = 'Enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!rollNumber.trim()) {
      errors.rollNumber = 'Roll number is required';
    }

    if (!messId) {
      errors.mess = 'Please select a mess hall';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (!validate()) {
      return;
    }

    if (!auth?.handleRegister) {
      setErrorMsg('Auth context unavailable.');
      return;
    }

    setSubmitting(true);
    try {
      await auth.handleRegister({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        rollNumber: rollNumber.trim(),
        messId,
      });
    } catch (err: any) {
      const status = err.status;
      if (status === 409) {
        setErrorMsg('An account already exists with that email or roll number.');
      } else if (status === 400) {
        setErrorMsg(err.message || 'Please check your inputs and try again.');
      } else if (err.message && err.message.includes('timeout')) {
        setErrorMsg("Couldn't reach the server. Check the address and try again.");
      } else {
        setErrorMsg(err.message || "Couldn't create your account. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassCard style={{ marginTop: 24 }}>
      <SectionTitle
        eyebrow="Student Sign-Up"
        title="Create Student Account"
        subtitle="Register to manage meal claims, rebates, and mess requests."
      />

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorBoxText}>{errorMsg}</Text>
        </View>
      ) : null}

      <TextField
        label="Full Name"
        placeholder="Jane Doe"
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
        }}
        autoCapitalize="words"
      />
      {fieldErrors.name ? <Text style={styles.fieldError}>{fieldErrors.name}</Text> : null}

      <TextField
        label="Email Address"
        placeholder="student@mess.edu"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
        }}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}

      <TextField
        label="Password"
        placeholder="At least 8 characters"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
        }}
        secureTextEntry
      />
      {fieldErrors.password ? <Text style={styles.fieldError}>{fieldErrors.password}</Text> : null}

      <TextField
        label="Roll Number"
        placeholder="e.g. 21B030045"
        value={rollNumber}
        onChangeText={(text) => {
          setRollNumber(text);
          if (fieldErrors.rollNumber) setFieldErrors((prev) => ({ ...prev, rollNumber: '' }));
        }}
        autoCapitalize="characters"
      />
      {fieldErrors.rollNumber ? <Text style={styles.fieldError}>{fieldErrors.rollNumber}</Text> : null}

      <View style={styles.selectWrap}>
        <Text style={styles.fieldLabel}>Select Mess Hall</Text>

        {loadingMesses ? (
          <View style={{ gap: 8 }}>
            <SkeletonBlock height={40} width="100%" />
          </View>
        ) : messError ? (
          <ErrorState message={messError} onRetry={loadMesses} />
        ) : messes.length === 0 ? (
          <EmptyState
            icon="home"
            title="No Messes Available"
            message="No messes are set up yet. Contact the mess office."
          />
        ) : (
          <View style={styles.messChipRow}>
            {messes.map((m) => {
              const active = m.id === messId;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => {
                    setMessId(m.id);
                    if (fieldErrors.mess) setFieldErrors((prev) => ({ ...prev, mess: '' }));
                  }}
                  style={[styles.messChip, active && styles.messChipActive]}
                >
                  <Text style={[styles.messChipText, active && styles.messChipTextActive]}>
                    {m.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
      {fieldErrors.mess ? <Text style={styles.fieldError}>{fieldErrors.mess}</Text> : null}

      <View style={styles.actionRow}>
        <PrimaryButton
          label="Create Account"
          icon="user-plus"
          tone="emerald"
          onPress={handleSubmit}
          loading={submitting}
        />
        {onNavigateToLogin ? (
          <Pressable
            onPress={onNavigateToLogin}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.backBtnText}>Already have an account? Sign In</Text>
          </Pressable>
        ) : null}
      </View>
    </GlassCard>
  );
}

const createStyles = (palette: ReturnType<typeof useThemePalette>) => StyleSheet.create({
  backBtn: { marginTop: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  backBtnText: { color: palette.emerald, fontSize: 13, fontWeight: '700' },

  errorBox: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: 'rgba(239,68,68,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorBoxText: { color: palette.text, fontSize: 13, fontWeight: '700' },
  fieldError: { color: palette.red, fontSize: 12, marginTop: -6, marginBottom: 10, fontWeight: '600' },
  selectWrap: { marginBottom: 14, marginTop: 4 },
  fieldLabel: { color: '#d4d4d8', fontSize: 12, marginBottom: 8, fontWeight: '700' },
  messChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  messChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  messChipActive: { backgroundColor: 'rgba(16,185,129,0.18)', borderColor: 'rgba(16,185,129,0.4)' },
  messChipText: { color: palette.muted, fontSize: 12.5, fontWeight: '700' },
  messChipTextActive: { color: palette.text },
  actionRow: { marginTop: 18, alignItems: 'stretch' },
});
