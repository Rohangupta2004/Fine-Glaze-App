import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { GradientButton } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const signIn = useAuthStore((s) => s.signIn);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedInput, setFocusedInput] = useState<'phone' | 'password' | null>(null);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      setError('Please enter your 10-digit mobile number and password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await signIn(phone.trim(), password);
      if (result.error) {
        const errStr = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || JSON.stringify(result.error);
        setError(errStr === '{}' ? 'Invalid mobile number or password. Please try again.' : errStr);
      } else {
        // Auth store handles navigation through root layout guard
      }
    } catch (e: any) {
      const errStr = typeof e === 'string' ? e : e?.message || 'Login failed';
      setError(errStr === '{}' ? 'Invalid mobile number or password. Please try again.' : errStr);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header — High Impact Executive Badge */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBadgeFrame}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandTitle}>FINE GLAZE</Text>
          <Text style={styles.brandSub}>Executive Structural Glazing Portal</Text>
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
            <Text style={styles.errorText}>
              {typeof error === 'string' ? error : (error as any)?.message || JSON.stringify(error)}
            </Text>
          </View>
        ) : null}

        {/* Form Card — Double Bezel Architecture */}
        <View style={styles.outerShell}>
          <View style={styles.innerCore}>
            <Text style={styles.title}>Sign In To Your Account</Text>

            {/* Phone Field with Country Code Badge */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mobile Number</Text>
              <View
                style={[
                  styles.inputContainer,
                  focusedInput === 'phone' && styles.inputFocused,
                ]}
              >
                {/* India Country Code Badge */}
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                </View>
                <View style={styles.fieldDivider} />
                <TextInput
                  style={styles.textInput}
                  placeholder="9876543210"
                  placeholderTextColor="#A09080"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  onFocus={() => setFocusedInput('phone')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View
                style={[
                  styles.inputContainer,
                  focusedInput === 'password' && styles.inputFocused,
                ]}
              >
                <Ionicons name="lock-closed-outline" size={18} color="#695030" style={{ marginLeft: 12 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  placeholderTextColor="#A09080"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={10}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#8B6840"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember device */}
            <View style={styles.rememberRow}>
              <Text style={styles.rememberText}>{t('auth.rememberDevice')}</Text>
              <Switch
                value={rememberDevice}
                onValueChange={setRememberDevice}
                trackColor={{ false: '#E2D9CC', true: '#695030' }}
                thumbColor={rememberDevice ? '#FFFFFF' : '#8B6840'}
              />
            </View>

            {/* Login button */}
            <GradientButton
              title={t('auth.login')}
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
            />
          </View>
        </View>

        {/* Made with Love in India Footer */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Made with ❤️ in India 🇮🇳</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBadgeFrame: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(184, 144, 71, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginBottom: spacing.sm,
    boxShadow: '0px 8px 24px rgba(105, 80, 48, 0.12)',
  } as any,
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    ...typography.h4,
    color: '#1E1815',
    fontFamily: fontFamily.semiBold,
    letterSpacing: 2,
  },
  brandSub: {
    ...typography.caption,
    color: '#695030',
    fontFamily: fontFamily.regular,
    fontSize: 11,
    marginTop: 2,
  },
  title: {
    ...typography.h6,
    color: '#1E1815',
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontFamily: fontFamily.semiBold,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  errorText: {
    ...typography.bodySmall,
    color: '#DC2626',
    fontFamily: fontFamily.medium,
    flex: 1,
  },

  // Double Bezel Architecture
  outerShell: {
    backgroundColor: 'rgba(184, 144, 71, 0.08)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(184, 144, 71, 0.25)',
    padding: 6,
    boxShadow: '0px 8px 24px rgba(105, 80, 48, 0.08)',
  } as any,
  innerCore: {
    backgroundColor: '#F5F2EC',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    padding: spacing.xl,
  },

  fieldGroup: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.caption,
    color: '#695030',
    fontFamily: fontFamily.medium,
    marginBottom: 6,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: 'rgba(184, 144, 71, 0.25)',
    borderRadius: 16,
    height: 52,
    overflow: 'hidden',
  },
  inputFocused: {
    borderColor: '#695030',
    boxShadow: '0px 0px 8px rgba(105, 80, 48, 0.2)',
  } as any,

  countryCodeBadge: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.semiBold,
    color: '#1E1815',
    fontSize: 14,
  },
  fieldDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(105, 80, 48, 0.15)',
  },

  textInput: {
    flex: 1,
    ...typography.bodyMedium,
    fontFamily: fontFamily.regular,
    color: '#1E1815',
    paddingHorizontal: 12,
    height: '100%',
  },
  eyeBtn: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  rememberText: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.regular,
    color: '#695030',
  },

  footerContainer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    color: '#8B6840',
    fontFamily: fontFamily.medium,
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
