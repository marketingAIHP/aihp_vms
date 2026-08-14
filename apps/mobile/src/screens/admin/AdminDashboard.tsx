import { router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DashboardHeader } from "../../components/admin/DashboardHeader";
import { ActionCard } from "../../components/admin/ActionCard";
import { StatsCard } from "../../components/admin/StatsCard";
import { VisitListCard } from "../../components/admin/VisitListCard";
import { useAuth } from "../../context/AuthContext";
import { useVmsData } from "../../hooks/use-vms-data";
import { colors, spacing } from "../../theme";
import {
  countVisitsForToday,
  getActiveVisitors,
  getRecentCheckIns,
  getTodayVisitHistory,
} from "./admin-utils";

export function AdminDashboard() {
  const { logout, session } = useAuth();
  const { error, loading, notifications, refresh, visits } = useVmsData();

  const totalVisitors = useMemo(() => visits.length, [visits]);
  const todayVisitors = useMemo(() => countVisitsForToday(visits), [visits]);
  const activeVisitors = useMemo(() => getActiveVisitors(visits), [visits]);
  const checkedOutVisitors = useMemo(() => getTodayVisitHistory(visits), [visits]);
  const recentCheckIns = useMemo(() => getRecentCheckIns(visits).slice(0, 5), [visits]);
  const todayHistory = useMemo(() => getTodayVisitHistory(visits).slice(0, 5), [visits]);

  if (!session) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DashboardHeader
        adminName={session.name}
        notificationCount={notifications.filter((item) => !item.readBy.includes(session.userId)).length}
        onNotificationPress={() => router.push("/admin-notifications")}
        onLogout={async () => {
          await logout();
          router.replace("/login");
        }}
      />
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.feedbackCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.feedbackText}>Loading dashboard data...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText} onPress={() => void refresh()}>
              Tap to retry
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visitor Statistics</Text>
        </View>

        <View style={styles.grid}>
          <StatsCard
            iconColor={colors.primary}
            iconBackgroundColor="#FCE8E8"
            icon="visits"
            label="Total Visitors"
            value={totalVisitors}
            trend="All visitor records across every site"
            onPress={() => router.push("/admin-visits")}
          />
          <StatsCard
            iconColor={colors.mutedTeal}
            iconBackgroundColor="#E6F7FA"
            icon="active"
            label="Checked-In Visitors"
            value={activeVisitors.length}
            trend="Currently inside the premises"
            onPress={() => router.push("/admin-live-monitoring")}
          />
          <StatsCard
            iconColor={colors.warning}
            iconBackgroundColor="#FBEDDB"
            icon="pending"
            label="Checked-Out Visitors"
            value={checkedOutVisitors.length}
            trend="Completed today"
            onPress={() => router.push("/admin-visit-history")}
          />
          <StatsCard
            iconColor={colors.navyGrey}
            iconBackgroundColor="#E9EEF6"
            icon="users"
            label="Today's Visitors"
            value={todayVisitors}
            trend="Checked in today across all sites"
            onPress={() => router.push("/admin-visits")}
          />
        </View>

        <View style={styles.actions}>
          <ActionCard
            title="Users"
            subtitle="Search, edit, and manage site manager accounts."
            icon="users"
            accentBackgroundColor="#FCE8E8"
            cardBackgroundColor="#FFF9F8"
            onPress={() => router.push("/admin-users")}
          />
          <ActionCard
            title="Reports"
            subtitle="Filter visitor operations and export daily activity."
            icon="reports"
            accentBackgroundColor="#E6F7FA"
            cardBackgroundColor="#F7FCFD"
            onPress={() => router.push("/admin-reports")}
          />
          <ActionCard
            title="QR Management"
            subtitle="Generate walk-in check-in and check-out URLs for each site."
            icon="qr"
            accentBackgroundColor="#F6EDE5"
            cardBackgroundColor="#FFFCF8"
            onPress={() => router.push("/admin-qr-management")}
          />
        </View>

        <VisitListCard
          title="Recent Check-Ins"
          records={recentCheckIns}
          emptyText="No active visitors are currently inside."
          onViewAll={() => router.push("/admin-live-monitoring")}
          variant="upcoming"
        />

        <VisitListCard
          title="Today Visit History"
          records={todayHistory}
          emptyText="No visit history available today"
          onViewAll={() => router.push("/admin-visit-history")}
          variant="history"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBackground
  },
  page: {
    flex: 1,
    backgroundColor: colors.screenBackground
  },
  content: {
    padding: spacing.md,
    gap: spacing.md
  },
  feedbackCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  feedbackText: {
    color: colors.secondaryText,
    fontSize: 14
  },
  errorCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20
  },
  retryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  section: {
    gap: spacing.xs
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800"
  },
  actions: {
    gap: spacing.sm
  }
});
