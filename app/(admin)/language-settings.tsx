/**
 * Language Settings — PRD §0.4
 * English default, Hindi + Marathi selectable.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Card } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी', flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', flag: '🇮🇳' },
];

export default function LanguageSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const [selected, setSelected] = useState(i18n.language);

  const changeLanguage = (code: string) => {
    setSelected(code);
    i18n.changeLanguage(code);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.language')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subtitle}>Select your preferred language</Text>

      {LANGUAGES.map((lang) => (
        <TouchableOpacity key={lang.code} onPress={() => changeLanguage(lang.code)}>
          <Card style={[styles.langCard, selected === lang.code && styles.langCardActive]} variant="interactive">
            <View style={styles.langRow}>
              <Text style={styles.flag}>{lang.flag}</Text>
              <View style={styles.langInfo}>
                <Text style={styles.langLabel}>{lang.label}</Text>
                <Text style={styles.langNative}>{lang.nativeLabel}</Text>
              </View>
              {selected === lang.code && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  title: { ...typography.h4, color: colors.ink },
  subtitle: { ...typography.bodySmall, color: colors.neutral[500], marginBottom: spacing.xl },
  langCard: { padding: spacing.xl, marginBottom: spacing.md },
  langCardActive: { borderWidth: 2, borderColor: colors.primary },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  flag: { fontSize: 28 },
  langInfo: { flex: 1 },
  langLabel: { ...typography.h6, color: colors.ink },
  langNative: { ...typography.bodySmall, color: colors.neutral[500], marginTop: 2 },
});
