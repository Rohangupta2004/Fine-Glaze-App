import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

const FEATURES = [
  {
    icon: 'business-sharp',
    title: 'Structural Facade BOQ Engine',
    desc: 'Real-time glazing material matching, unit rates, AI alias resolution, and Excel MIS grid sync.',
    gradient: ['#5B4122', '#8B6840'] as const,
  },
  {
    icon: 'location-sharp',
    title: 'Geofenced Attendance & Selfie Punch',
    desc: 'Precision GPS site radius verification with instant selfie capture and offline sync queue.',
    gradient: ['#0369A1', '#0EA5E9'] as const,
  },
  {
    icon: 'mic-sharp',
    title: 'Voice Notes & Direct Site Snap',
    desc: 'Record voice updates on site, snap instant photo attachments, and send 1-tap site status chips.',
    gradient: ['#7E22CE', '#A855F7'] as const,
  },
  {
    icon: 'stats-chart-sharp',
    title: 'Executive Analytics & DPR',
    desc: 'Live progress charts, supervisor DPR reviews, client approvals, and daily milestone tracking.',
    gradient: ['#15803D', '#22C55E'] as const,
  },
  {
    icon: 'shield-checkmark-sharp',
    title: 'Multi-Role Security',
    desc: 'Customized workspaces for Owners, Project Managers, Supervisors, Clients, and Field Workers.',
    gradient: ['#C2410C', '#F97316'] as const,
  },
  {
    icon: 'cube-sharp',
    title: 'Material Requests & GRN',
    desc: 'Request site materials, issue purchase orders, record goods received notes, and track stock.',
    gradient: ['#475569', '#64748B'] as const,
  },
];

const STATS = [
  { label: 'Projects Completed', val: '250+' },
  { label: 'Sq. Ft. Facade Glazed', val: '4.8M+' },
  { label: 'Active Site Workers', val: '1,200+' },
  { label: 'Accuracy Rating', val: '99.9%' },
];

export default function OfficialLandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Interactive Calculator State
  const [areaSqFt, setAreaSqFt] = useState('1500');
  const [ratePerSqFt, setRatePerSqFt] = useState('450');

  const calcArea = parseFloat(areaSqFt) || 0;
  const calcRate = parseFloat(ratePerSqFt) || 0;
  const totalCost = (calcArea * calcRate).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Navbar */}
        <View style={[styles.navbar, { paddingTop: insets.top + spacing.xs }]}>
          <View style={styles.brandGroup}>
            <Image source={require('../../assets/favicon.png')} style={styles.navLogo} />
            <Text style={styles.brandTitle}>FINE GLAZE</Text>
          </View>
          <TouchableOpacity
            style={styles.launchNavBtn}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#5B4122', '#8B6840']} style={styles.launchNavGrad}>
              <Text style={styles.launchNavBtnText}>Launch App →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <LinearGradient colors={['#181310', '#2C211A', '#120D0A']} style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles-sharp" size={14} color="#FDFBF7" />
            <Text style={styles.heroBadgeText}>FINE GLAZE PLATFORM V1.0</Text>
          </View>

          <Text style={styles.heroHeading}>
            Engineering Excellence in{'\n'}
            <Text style={styles.goldHighlight}>Structural Glazing & Facades</Text>
          </Text>

          <Text style={styles.heroSub}>
            The definitive construction management platform for architectural glass facades, BOQ tracking,
            geofenced punch-in, daily progress reports, and real-time team collaboration.
          </Text>

          <View style={styles.heroCtaGroup}>
            <TouchableOpacity style={styles.primaryHeroBtn} onPress={() => router.push('/(auth)/login')} activeOpacity={0.85}>
              <LinearGradient colors={['#5B4122', '#8B6840', '#A88454']} style={styles.heroGrad}>
                <Ionicons name="rocket-sharp" size={18} color="#FFFFFF" />
                <Text style={styles.primaryHeroBtnText}>Get Started / Login</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryHeroBtn} onPress={() => router.push('/(auth)/welcome')} activeOpacity={0.8}>
              <Ionicons name="phone-portrait-sharp" size={18} color="#FDFBF7" />
              <Text style={styles.secondaryHeroBtnText}>App Overview</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsRow}>
            {STATS.map((stat, idx) => (
              <View key={idx} style={styles.statBox}>
                <Text style={styles.statVal}>{stat.val}</Text>
                <Text style={styles.statLbl}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Features Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTag}>ENTERPRISE FEATURES</Text>
          <Text style={styles.sectionHeading}>Built for Glazing Contractors & Site Teams</Text>

          <View style={styles.featuresGrid}>
            {FEATURES.map((feat, i) => (
              <View key={i} style={styles.featureCard}>
                <LinearGradient colors={[...feat.gradient]} style={styles.featureIconBg}>
                  <Ionicons name={feat.icon as any} size={22} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.featureTitle}>{feat.title}</Text>
                <Text style={styles.featureDesc}>{feat.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quote Calculator Showcase */}
        <View style={styles.calcSection}>
          <LinearGradient colors={['#FDFBF7', '#F5F2EC']} style={styles.calcCard}>
            <View style={styles.calcHeader}>
              <LinearGradient colors={['#5B4122', '#8B6840']} style={styles.calcBadgeIcon}>
                <Ionicons name="calculator-sharp" size={20} color="#FFFFFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.calcTitle}>Live Glazing Quote Estimator</Text>
                <Text style={styles.calcSub}>Estimate total facade cost based on area and unit rate</Text>
              </View>
            </View>

            <View style={styles.calcRow}>
              <View style={styles.calcField}>
                <Text style={styles.calcLabel}>Facade Area (Sq. Ft.)</Text>
                <TextInput
                  style={styles.calcInput}
                  value={areaSqFt}
                  onChangeText={setAreaSqFt}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.calcField}>
                <Text style={styles.calcLabel}>Rate per Sq. Ft. (₹)</Text>
                <TextInput
                  style={styles.calcInput}
                  value={ratePerSqFt}
                  onChangeText={setRatePerSqFt}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.calcResultBox}>
              <Text style={styles.calcResultLabel}>Estimated Total Quote Value</Text>
              <Text style={styles.calcResultVal}>{totalCost}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Download & Access */}
        <View style={styles.accessSection}>
          <Text style={styles.accessHeading}>Ready to Transform Your Site Operations?</Text>
          <Text style={styles.accessSub}>Access Fine Glaze on Web, iOS, or download the native Android APK directly.</Text>

          <View style={styles.accessBtnRow}>
            <TouchableOpacity style={styles.accessBtn} onPress={() => router.push('/(auth)/login')} activeOpacity={0.8}>
              <Ionicons name="globe-sharp" size={20} color="#695030" />
              <Text style={styles.accessBtnText}>Open Web App</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.accessBtn} onPress={() => router.push('/(admin)/help-about')} activeOpacity={0.8}>
              <Ionicons name="logo-android" size={20} color="#15803D" />
              <Text style={styles.accessBtnText}>Android APK</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <Text style={styles.footerBrand}>FINE GLAZE ARCHITECTURAL SYSTEMS</Text>
          <Text style={styles.footerCopy}>© 2026 Fine Glaze. All rights reserved. Precision Facade Engineering.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181310' },
  scrollContent: { flexGrow: 1, backgroundColor: '#FAF8F5' },

  // Navbar
  navbar: {
    backgroundColor: '#181310',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navLogo: { width: 32, height: 32, borderRadius: 8 },
  brandTitle: { fontSize: 16, fontFamily: fontFamily.bold, color: '#FFFFFF', letterSpacing: 1 },
  launchNavBtn: { borderRadius: 20, overflow: 'hidden' },
  launchNavGrad: { paddingHorizontal: 16, paddingVertical: 8 },
  launchNavBtnText: { fontSize: 12, fontFamily: fontFamily.bold, color: '#FFFFFF' },

  // Hero Section
  heroSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['4xl'],
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 104, 64, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(168, 132, 84, 0.5)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: spacing.lg,
  },
  heroBadgeText: { fontSize: 11, fontFamily: fontFamily.bold, color: '#FDFBF7', letterSpacing: 1 },
  heroHeading: {
    fontSize: Platform.OS === 'web' ? 36 : 28,
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 46 : 36,
    marginBottom: spacing.md,
  },
  goldHighlight: { color: '#A88454' },
  heroSub: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: '#C4B9A8',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 600,
    marginBottom: spacing.xl,
  },
  heroCtaGroup: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', justifyContent: 'center', marginBottom: spacing['3xl'] },
  primaryHeroBtn: { borderRadius: 24, overflow: 'hidden', minWidth: 180 },
  heroGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14 },
  primaryHeroBtnText: { fontSize: 15, fontFamily: fontFamily.bold, color: '#FFFFFF' },
  secondaryHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 24,
    minWidth: 160,
  },
  secondaryHeroBtnText: { fontSize: 15, fontFamily: fontFamily.bold, color: '#FDFBF7' },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    width: '100%',
    maxWidth: 720,
  },
  statBox: { alignItems: 'center', minWidth: 120 },
  statVal: { fontSize: 24, fontFamily: fontFamily.bold, color: '#A88454' },
  statLbl: { fontSize: 11, fontFamily: fontFamily.medium, color: '#C4B9A8', marginTop: 2 },

  // Features Section
  sectionContainer: { paddingHorizontal: spacing.xl, paddingVertical: spacing['4xl'], maxWidth: 1100, alignSelf: 'center', width: '100%' },
  sectionTag: { fontSize: 12, fontFamily: fontFamily.bold, color: '#695030', letterSpacing: 1.5, textAlign: 'center', marginBottom: 4 },
  sectionHeading: { fontSize: 24, fontFamily: fontFamily.bold, color: '#1E1815', textAlign: 'center', marginBottom: spacing['3xl'] },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, justifyContent: 'center' },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.xl,
    width: Platform.OS === 'web' ? 320 : '100%',
    borderWidth: 1,
    borderColor: '#EAE5DC',
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.04)' as any,
  },
  featureIconBg: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  featureTitle: { fontSize: 17, fontFamily: fontFamily.bold, color: '#1E1815', marginBottom: 6 },
  featureDesc: { fontSize: 13, fontFamily: fontFamily.regular, color: '#8B7E74', lineHeight: 19 },

  // Calculator Section
  calcSection: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'], maxWidth: 900, alignSelf: 'center', width: '100%' },
  calcCard: { borderRadius: 24, padding: spacing.xl, borderWidth: 1, borderColor: '#EAE5DC' },
  calcHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  calcBadgeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  calcTitle: { fontSize: 18, fontFamily: fontFamily.bold, color: '#1E1815' },
  calcSub: { fontSize: 12, fontFamily: fontFamily.regular, color: '#8B7E74', marginTop: 2 },
  calcRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', marginBottom: spacing.lg },
  calcField: { flex: 1, minWidth: 200 },
  calcLabel: { fontSize: 12, fontFamily: fontFamily.bold, color: '#695030', marginBottom: 6 },
  calcInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE5DC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: fontFamily.bold, color: '#1E1815' },
  calcResultBox: { backgroundColor: '#5B4122', borderRadius: 16, padding: spacing.lg, alignItems: 'center' },
  calcResultLabel: { fontSize: 12, fontFamily: fontFamily.bold, color: '#FDFBF7', opacity: 0.9 },
  calcResultVal: { fontSize: 26, fontFamily: fontFamily.bold, color: '#FFFFFF', marginTop: 4 },

  // Access Section
  accessSection: { backgroundColor: '#181310', paddingHorizontal: spacing.xl, paddingVertical: spacing['4xl'], alignItems: 'center' },
  accessHeading: { fontSize: 24, fontFamily: fontFamily.bold, color: '#FFFFFF', textAlign: 'center', marginBottom: spacing.xs },
  accessSub: { fontSize: 14, fontFamily: fontFamily.regular, color: '#C4B9A8', textAlign: 'center', marginBottom: spacing.xl, maxWidth: 550 },
  accessBtnRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  accessBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  accessBtnText: { fontSize: 14, fontFamily: fontFamily.bold, color: '#1E1815' },

  // Footer
  footer: { backgroundColor: '#120D0A', paddingHorizontal: spacing.xl, paddingTop: spacing.xl, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)' },
  footerBrand: { fontSize: 12, fontFamily: fontFamily.bold, color: '#A88454', letterSpacing: 1, marginBottom: 4 },
  footerCopy: { fontSize: 11, fontFamily: fontFamily.regular, color: '#8B7E74', textAlign: 'center' },
});
