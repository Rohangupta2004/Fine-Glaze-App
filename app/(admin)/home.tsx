import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ImageBackground,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../../src/components';
import { AreaChart } from '../../src/components/SVGCharts';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useEmployees } from '../../src/hooks/useEmployees';
import { usePendingDprs, usePendingLeave, usePendingMaterialRequests } from '../../src/hooks/useApprovals';
import { useUnreadCount, useNotifications } from '../../src/hooks/useNotifications';
import { useMyTasks } from '../../src/hooks/useTasks';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../src/lib/supabase';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function AdminHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const firstName = profile?.full_name?.split(' ')[0] || 'Admin';

  const { data: projects, refetch: rProjects, isRefetching: r1 } = useProjects();
  const { data: employees, refetch: rEmployees, isRefetching: r2 } = useEmployees();
  const { data: pendingDprs } = usePendingDprs();
  const { data: pendingLeave } = usePendingLeave();
  const { data: pendingMaterials } = usePendingMaterialRequests();
  const { data: unreadCount } = useUnreadCount(profile?.id);
  const { data: notifications, refetch: rNotifications } = useNotifications(profile?.id);
  const { data: myTasks } = useMyTasks(profile?.id);

  const activeProjects = (projects || []).filter((p) => p.status !== 'completed');
  const activeEmployees = (employees || []).filter((e) => e.status === 'active');
  const totalPending = (pendingDprs?.length || 0) + (pendingLeave?.length || 0) + (pendingMaterials?.length || 0);
  
  // Count tasks assigned to the admin that are not completed
  const pendingTasks = (myTasks || []).filter(t => t.status !== 'done').length;

  const importantCount = (notifications || []).filter((n) => n.important && !n.read_at).length;

  const todayStr = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: attendanceToday, refetch: rAttendance } = useQuery({
    queryKey: ['attendance-today', todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('status, location_verified')
        .eq('date', todayStr);
      if (error) throw error;
      return data || [];
    }
  });

  const attendanceAlertsCount = (attendanceToday || []).filter(
    (a: any) => a.location_verified === false || a.status === 'absent'
  ).length;

  const { data: dprTrend, refetch: rDprTrend } = useQuery({
    queryKey: ['admin-dpr-trend'],
    queryFn: async () => {
      const dates: string[] = [];
      const labels: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        dates.push(iso);
        labels.push(d.toLocaleDateString('en-IN', { weekday: 'short' }));
      }

      const { data, error } = await supabase
        .from('dprs')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      if (error) throw error;

      const counts = dates.map(date => {
        return (data || []).filter((d: any) => d.created_at?.slice(0, 10) === date).length;
      });

      return { labels, counts };
    }
  });

  const onRefresh = () => { rProjects(); rEmployees(); rAttendance(); rNotifications(); rDprTrend(); };

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#FFFFFF', '#F9F8F6', '#EAE6DF']} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
        style={StyleSheet.absoluteFill} 
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={r1 || r2} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.heroName}>{firstName}</Text>
            <Text style={styles.heroDate}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity onPress={() => router.push('/(admin)/global-search' as any)} style={styles.heroBtn}>
              <Ionicons name="search" size={20} color="#1E1815" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
          <TopStatCard 
            title="Notifications" 
            value={unreadCount || 0} 
            icon="notifications" 
            iconColor={(unreadCount || 0) > 0 ? '#D97706' : '#6A4E36'}
            iconBgColor={(unreadCount || 0) > 0 ? 'rgba(217, 119, 6, 0.12)' : 'rgba(255,255,255,0.8)'}
            onPress={() => router.push('/(admin)/notifications')} 
          />
          <TopStatCard 
            title="DPR Pending" 
            value={pendingDprs?.length || 0} 
            icon="document-text" 
            iconColor={(pendingDprs?.length || 0) > 0 ? '#2563EB' : '#6A4E36'}
            iconBgColor={(pendingDprs?.length || 0) > 0 ? 'rgba(37, 99, 235, 0.12)' : 'rgba(255,255,255,0.8)'}
            onPress={() => router.push('/(admin)/approvals')} 
          />
        </ScrollView>
        </View>

      <View style={styles.body}>
        <SectionHeader 
          title="Performance Trends" 
          actionLabel="View detailed" 
          onAction={() => router.push('/(admin)/analytics')} 
        />
        <Card style={styles.chartCard} padding={spacing.lg} variant="elevated">
          <Text style={styles.chartTitle}>DPR Submissions (Daily)</Text>
          {dprTrend && (
            <AreaChart 
              data={dprTrend.counts} 
              labels={dprTrend.labels} 
              width={320} 
              height={160} 
              strokeColor="#695030" 
              fillColor="#8B6840" 
            />
          )}
        </Card>

        <SectionHeader title="Workspace" actionLabel="View all" onAction={() => {}} />
        <View style={styles.manageGrid}>
          <ManageCard 
            title="Projects" 
            subtitle="Workspaces & Sites" 
            icon="business" 
            fullWidth={true}
            onPress={() => router.push('/(admin)/projects')}
          />
          <ManageCard 
            title="Employees" 
            subtitle="Team & Roles" 
            icon="people" 
            onPress={() => router.push('/(admin)/employees')}
          />
          <ManageCard 
            title="Clients" 
            subtitle="Organisations" 
            icon="folder" 
            onPress={() => router.push('/(admin)/clients')}
          />
          <ManageCard 
            title="Materials" 
            subtitle="Stock & Supplies" 
            icon="cube" 
            onPress={() => router.push('/(admin)/materials')}
          />
          <ManageCard 
            title="Documents" 
            subtitle="Vault & Uploads" 
            icon="document-text" 
            onPress={() => router.push('/(admin)/documents')}
          />
          <ManageCard 
            title="Assign Site" 
            subtitle="Allocate Team & Workers" 
            icon="people-circle" 
            fullWidth={true}
            onPress={() => router.push('/(admin)/assign-site')}
          />
        </View>
      </View>
    </ScrollView>
    </View>
  );
}

interface SectionHeaderProps { title: string; actionLabel?: string; onAction?: () => void; }
function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.titleWrap}>
        <Ionicons name={title === "Manage" ? "options" : "business"} size={18} color="#695030" style={{ marginRight: 6 }} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} style={styles.seeAllBtn}>
          <Text style={styles.seeAll}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color="#1E1815" />
        </TouchableOpacity>
      )}
    </View>
  );
}

interface TopStatCardProps { 
  icon: string; 
  value: number | string; 
  title: string; 
  onPress: () => void; 
  iconColor?: string; 
  iconBgColor?: string; 
}
function TopStatCard({ icon, value, title, onPress, iconColor = '#6A4E36', iconBgColor = 'rgba(255,255,255,0.8)' }: TopStatCardProps) {
  return (
    <Card 
      onPress={onPress} 
      style={[styles.statCard, { width: 130 }]} 
      padding={spacing.md}
      variant="elevated"
    >
      <View style={styles.statCardTop}>
        <View style={[styles.statIconWrap, { backgroundColor: iconBgColor }]}>
          <Ionicons name={icon as any} size={20} color={iconColor} />
        </View>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </Card>
  );
}

interface ManageCardProps { icon: string; title: string; subtitle: string; fullWidth?: boolean; onPress: () => void; colors?: [string, string]; }
function ManageCard({ icon, title, subtitle, fullWidth = false, onPress, colors }: ManageCardProps) {
  const iconColor = '#6A4E36';
  return (
    <Card 
      onPress={onPress} 
      style={[styles.manageCard, fullWidth ? { width: '100%' } : styles.manageCardWrap]} 
      padding={spacing.lg}
      variant="flat"
    >
      <View style={styles.manageCardInner}>
        <View style={[styles.manageIconWrap, { backgroundColor: '#F3F0EB' }]}>
          <Ionicons name={icon as any} size={22} color={iconColor} />
        </View>
        <View style={styles.manageContent}>
          <Text style={styles.manageLabel}>{title}</Text>
          <Text style={styles.manageSub}>{subtitle}</Text>
        </View>
        <View style={styles.manageArrow}>
          <Ionicons name="arrow-forward" size={16} color="#A39688" />
        </View>
      </View>
    </Card>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },

  // Hero
  hero: { paddingBottom: spacing.lg },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(250,248,245,0.92)' }, // Creates the faded watermark effect
  heroBgImage: { opacity: 0.3, resizeMode: 'cover' },
  
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  heroLeft: { flex: 1 },
  greeting: { fontSize: 15, color: '#666', fontFamily: fontFamily.medium, letterSpacing: 0.2 },
  heroName: { fontSize: 32, color: '#1E1815', fontFamily: fontFamily.bold, marginTop: 2, letterSpacing: -0.5 },
  heroDate: { fontSize: 13, color: '#666', marginTop: 4, fontFamily: fontFamily.medium },
  
  heroActions: { flexDirection: 'row', gap: spacing.md, marginTop: 4 },
  heroBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 4px 12px rgba(0,0,0,0.06)' } as any,
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
  badgeText: { fontSize: 10, color: '#fff', fontFamily: fontFamily.bold },

  // Stats Scroll
  statsScroll: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.sm },
  statCardWrap: { width: 120 },
  statCard: { backgroundColor: '#fff', borderRadius: 20, padding: spacing.md, boxShadow: '0px 6px 16px rgba(0,0,0,0.04)' } as any,
  statCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  statIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 26, fontFamily: fontFamily.bold, color: '#1E1815' },
  statLabel: { fontSize: 13, color: '#666', fontFamily: fontFamily.medium, marginTop: 2 },

  // Body
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  // Section Header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.lg },
  titleWrap: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontFamily: fontFamily.bold, color: '#1E1815' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAll: { fontSize: 13, color: '#1E1815', fontFamily: fontFamily.medium },

  // Manage Grid
  manageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  manageCardWrap: { width: '47.5%' },
  manageCard: { borderRadius: 24, padding: spacing.lg, minHeight: 160, justifyContent: 'space-between', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', boxShadow: '0px 6px 16px rgba(0,0,0,0.03)' } as any,
  manageCardInner: { flex: 1, justifyContent: 'space-between' },
  manageIconWrap: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  manageContent: { marginTop: spacing.md },
  manageLabel: { fontSize: 16, fontFamily: fontFamily.bold, color: '#1E1815' },
  manageSub: { fontSize: 12, color: colors.neutral[500], fontFamily: fontFamily.medium, marginTop: 2 },
  manageArrow: { position: 'absolute', top: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 2px 8px rgba(0,0,0,0.05)' } as any,

  // Projects
  projectCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.md,
    boxShadow: '0px 4px 16px rgba(0,0,0,0.03)',
  } as any,
  projectThumbnail: { width: 70, height: 70, borderRadius: 12, backgroundColor: '#F3F4F6' },
  projectInfo: { flex: 1, marginLeft: spacing.md, justifyContent: 'center' },
  projectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  projectName: { fontSize: 15, fontFamily: fontFamily.bold, color: '#1E1815', flex: 1, marginRight: spacing.sm },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#059669' },
  statusText: { fontSize: 10, fontFamily: fontFamily.bold, color: '#059669' },
  projectLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md },
  projectDetail: { fontSize: 12, color: colors.neutral[500], fontFamily: fontFamily.medium },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  progressTrack: { flex: 1, height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#695030' },
  progressText: { fontSize: 12, fontFamily: fontFamily.bold, color: '#1E1815' },

  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  emptyText: { fontSize: 14, color: colors.neutral[400], fontFamily: fontFamily.medium },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.08)',
    boxShadow: '0px 4px 14px rgba(0,0,0,0.03)',
    marginBottom: spacing.md,
    alignItems: 'center',
  } as any,
  chartTitle: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: '#1E1815',
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
});
