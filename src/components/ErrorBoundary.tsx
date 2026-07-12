/**
 * ErrorBoundary — Catches JS errors and shows a friendly fallback.
 * Prevents white-screen crashes. Matches Fine Glaze cream/bronze theme.
 */
import React, { Component, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional label shown in the error UI (e.g. screen name) */
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <Ionicons name="warning-outline" size={48} color={colors.warning} />
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            {this.props.label
              ? `An error occurred in ${this.props.label}.`
              : 'An unexpected error occurred.'}
          </Text>
          {__DEV__ && this.state.error && (
            <ScrollView style={styles.errorBox} contentContainerStyle={{ padding: spacing.md }}>
              <Text style={styles.errorText}>{this.state.error.message}</Text>
            </ScrollView>
          )}
          <TouchableOpacity style={styles.retryBtn} onPress={this.handleRetry} activeOpacity={0.7}>
            <Ionicons name="refresh" size={18} color={colors.white} />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h4,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorBox: {
    maxHeight: 120,
    width: '100%',
    backgroundColor: colors.errorBg,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    fontFamily: 'monospace',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryText: {
    ...typography.button,
    color: colors.white,
  },
});
