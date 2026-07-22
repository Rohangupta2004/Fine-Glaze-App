import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  useWindowDimensions,
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
import { fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
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
  const { width: windowWidth } = useWindowDimensions();
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
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.md }}>
              <View style={styles.brandLogoFrame}>
                <Image 
                  source={require('../../assets/images/logo.png')} 
                  style={styles.brandLogoImage} 
                  resizeMode="contain" 
                />
              </View>
              <View style={styles.heroLeft}>
                <Text style={styles.greeting}>{getGreeting()} 👋</Text>
                <Text style={styles.heroName}>{firstName}</Text>
                <Text style={styles.heroDate}>
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
              </View>
            </View>
            <View style={styles.heroActions}>
              <TouchableOpacity onPress={() => router.push('/(admin)/notifications' as any)} style={styles.heroBtn}>
                <Ionicons name="notifications-outline" size={20} color="#1E1815" />
                {(unreadCount || 0) > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(admin)/global-search' as any)} style={styles.heroBtn}>
                <Ionicons name="search" size={20} color="#1E1815" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Action Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            <TouchableOpacity 
              style={styles.actionChip}
              onPress={() => router.push('/(admin)/create-project' as any)}
            >
              <LinearGradient colors={['#695030', '#8B6840']} style={styles.chipGradient} start={{x:0, y:0}} end={{x:1, y:1}}>
                <Ionicons name="add-circle" size={16} color="#FFF" />
                <Text style={styles.actionChipTextPrimary}>+ New Project</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionChipSecondary}
              onPress={() => router.push('/(admin)/add-employee' as any)}
            >
              <Ionicons name="person-add-outline" size={15} color="#695030" />
              <Text style={styles.actionChipTextSecondary}>Add Employee</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionChipSecondary}
              onPress={() => router.push('/(admin)/approvals' as any)}
            >
              <Ionicons name="checkmark-done-circle-outline" size={16} color="#695030" />
              <Text style={styles.actionChipTextSecondary}>DPR Approvals ({pendingDprs?.length || 0})</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionChipSecondary}
              onPress={() => router.push('/(admin)/materials' as any)}
            >
              <Ionicons name="cube-outline" size={15} color="#695030" />
              <Text style={styles.actionChipTextSecondary}>Materials</Text>
            </TouchableOpacity>
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
            <TopStatCard 
              title="Active Sites" 
              value={activeProjects.length} 
              icon="business" 
              iconGradient={['#695030', '#8B6840']}
              cardGradient={['#FFFFFF', '#FAF7F0']}
              onPress={() => router.push('/(admin)/projects')} 
            />
            <TopStatCard 
              title="Notifications" 
              value={unreadCount || 0} 
              icon="notifications" 
              iconGradient={['#B89047', '#D4AF37']}
              cardGradient={['#FFFFFF', '#FDFBF7']}
              onPress={() => router.push('/(admin)/notifications')} 
            />
            <TopStatCard 
              title="DPR Pending" 
              value={pendingDprs?.length || 0} 
              icon="document-text" 
              iconGradient={['#9A7B4F', '#C4A97A']}
              cardGradient={['#FFFFFF', '#FBF8F2']}
              onPress={() => router.push('/(admin)/approvals')} 
            />
            <TopStatCard 
              title="Active Team" 
              value={activeEmployees.length} 
              icon="people" 
              iconGradient={['#4A3728', '#695030']}
              cardGradient={['#FFFFFF', '#FAF6F0']}
              onPress={() => router.push('/(admin)/employees')} 
            />
          </ScrollView>
        </View>

      <View style={styles.body}>
        <SectionHeader 
          title="Performance Trends" 
          actionLabel="View detailed" 
          onAction={() => router.push('/(admin)/analytics')} 
        />
        <Card style={styles.chartCard} padding={spacing.lg} variant="flat" gradientColors={['#FFFFFF', '#FFFFFF']}>
          <Text style={styles.chartTitle}>DPR Submissions (Daily)</Text>
          {dprTrend && (
            <AreaChart 
              data={dprTrend.counts} 
              labels={dprTrend.labels} 
              width={Math.max(240, windowWidth - 72)} 
              height={150} 
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
            iconGradient={['#695030', '#8B6840']}
            fullWidth={true}
            onPress={() => router.push('/(admin)/projects')}
          />
          <ManageCard 
            title="Employees" 
            subtitle="Team & Roles" 
            icon="people" 
            iconGradient={['#B89047', '#D4AF37']}
            onPress={() => router.push('/(admin)/employees')}
          />
          <ManageCard 
            title="Clients" 
            subtitle="Organisations" 
            icon="folder" 
            iconGradient={['#9A7B4F', '#C4A97A']}
            onPress={() => router.push('/(admin)/clients')}
          />
          <ManageCard 
            title="Materials" 
            subtitle="Stock & Supplies" 
            icon="cube" 
            iconGradient={['#4A3728', '#695030']}
            onPress={() => router.push('/(admin)/materials')}
          />
          <ManageCard 
            title="Documents" 
            subtitle="Vault & Uploads" 
            icon="document-text" 
            iconGradient={['#8B6840', '#B89047']}
            onPress={() => router.push('/(admin)/documents')}
          />
          <ManageCard 
            title="Assign Site" 
            subtitle="Allocate Team & Workers" 
            icon="people-circle" 
            iconGradient={['#2C2219', '#4A3728']}
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
  iconGradient?: readonly [string, string];
  cardGradient?: readonly [string, string];
}
function TopStatCard({ 
  icon, 
  value, 
  title, 
  onPress, 
  iconGradient = ['#695030', '#8B6840'],
  cardGradient = ['#FFFFFF', '#FAF7F0']
}: TopStatCardProps) {
  return (
    <Card 
      onPress={onPress} 
      style={[styles.statCard, { width: 145 }]} 
      variant="elevated"
      gradientColors={cardGradient as any}
      padding={spacing.md}
    >
      <View style={styles.statCardTop}>
        <LinearGradient
          colors={iconGradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.statIconWrap, { boxShadow: '0px 4px 14px rgba(0, 0, 0, 0.12)' } as any]}
        >
          <Ionicons name={icon as any} size={20} color="#FFFFFF" />
        </LinearGradient>
      </View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{title}</Text>
    </Card>
  );
}

interface ManageCardProps { 
  icon: string; 
  title: string; 
  subtitle: string; 
  fullWidth?: boolean; 
  onPress: () => void; 
  iconGradient?: readonly [string, string];
}
function ManageCard({ 
  icon, 
  title, 
  subtitle, 
  fullWidth = false, 
  onPress, 
  iconGradient = ['#695030', '#8B6840']
}: ManageCardProps) {
  return (
    <Card 
      onPress={onPress} 
      style={[styles.manageCard, fullWidth ? { width: '100%' } : styles.manageCardWrap]} 
      variant="interactive"
      gradientColors={['#FFFFFF', '#FFFFFF']}
      padding={spacing.lg}
    >
      <View style={styles.manageCardInner}>
        <LinearGradient
          colors={iconGradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.manageIconWrap, { boxShadow: '0px 4px 14px rgba(0, 0, 0, 0.12)' } as any]}
        >
          <Ionicons name={icon as any} size={22} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.manageContent}>
          <Text style={styles.manageLabel} numberOfLines={1}>{title}</Text>
          <Text style={styles.manageSub} numberOfLines={1}>{subtitle}</Text>
        </View>
        <View style={styles.manageArrow}>
          <Ionicons name="arrow-forward" size={16} color="#8B6840" />
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
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(250,248,245,0.92)' },
  heroBgImage: { opacity: 0.3, resizeMode: 'cover' },
  
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  brandLogoFrame: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(184, 144, 71, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    boxShadow: '0px 6px 18px rgba(105, 80, 48, 0.12)',
  } as any,
  brandLogoImage: {
    width: '100%',
    height: '100%',
  },
  heroLeft: { flex: 1 },
  greeting: { fontSize: 14, color: '#666', fontFamily: fontFamily.medium, letterSpacing: 0.2 },
  heroName: { fontSize: 30, color: '#1E1815', fontFamily: fontFamily.bold, marginTop: 1, letterSpacing: -0.5 },
  heroDate: { fontSize: 12, color: '#666', marginTop: 2, fontFamily: fontFamily.medium },
  
  heroActions: { flexDirection: 'row', gap: spacing.md },
  heroBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 4px 12px rgba(0,0,0,0.06)' } as any,
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
  badgeText: { fontSize: 10, color: '#fff', fontFamily: fontFamily.bold },

  // Chips
  chipsScroll: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.lg },
  actionChip: { borderRadius: 20, overflow: 'hidden' },
  chipGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  actionChipTextPrimary: { fontSize: 12, fontFamily: fontFamily.semiBold, color: '#FFFFFF' },
  actionChipSecondary: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(105, 80, 48, 0.15)' },
  actionChipTextSecondary: { fontSize: 12, fontFamily: fontFamily.medium, color: '#695030' },

  // Stats Scroll
  statsScroll: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.sm },
  statCardWrap: { width: 120 },
  statCard: { borderRadius: 24 } as any,
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
  manageCard: { borderRadius: 24, minHeight: 160, justifyContent: 'space-between' } as any,
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
