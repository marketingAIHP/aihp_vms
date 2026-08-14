import { router } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionCard } from "../../components/admin/ActionCard";
import { DashboardHeader } from "../../components/admin/DashboardHeader";
import { useAuth } from "../../context/AuthContext";
import { useVmsData } from "../../hooks/use-vms-data";
import { colors, spacing } from "../../theme";
import { StatsCard } from "../../components/admin/StatsCard";
import { VisitListCard } from "../../components/admin/VisitListCard";
import { countVisitsForToday, getActiveVisitors, getTodayVisitHistory } from "../admin/admin-utils";

export function SiteManagerDashboard() {
  const { logout, session } = useAuth();
  const { notifications, visits } = useVmsData();

  if (!session) {
    return null;
  }

  const currentSession = session;
  const assignedVisits = useMemo(
    () => visits.filter((visit) => visit.building === currentSession.siteName),
    [currentSession.siteName, visits]
  );
  const totalVisitorsToday = useMemo(() => countVisitsForToday(assignedVisits), [assignedVisits]);
  const checkedInVisitors = useMemo(() => getActiveVisitors(assignedVisits), [assignedVisits]);
  const checkedOutVisitors = useMemo(() => getTodayVisitHistory(assignedVisits), [assignedVisits]);
  const recentVisitors = useMemo(() => [...assignedVisits]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5), [assignedVisits]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DashboardHeader
        adminName={session.name}
        notificationCount={notifications.filter((item) => item.targetRoles.includes("site_manager") && !item.readBy.includes(session.userId)).length}
        onNotificationPress={() => router.push("/site-manager-notifications")}
        onLogout={async () => {
          await handleLogout();
        }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.assignedSiteCard}>
          <Text style={styles.assignedSiteLabel}>Site</Text>
          <Text style={styles.assignedSiteValue}>{session.siteName || "Not Assigned"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visitor Statistics</Text>
        </View>

        <View style={styles.metricGrid}>
          <StatsCard
            iconColor={colors.primary}
            iconBackgroundColor="#FCE8E8"
            icon="visits"
            label="Total Visitors"
            value={assignedVisits.length}
            trend="Overall visitor records linked to your site"
            onPress={() => router.push("/site-manager-visitors")}
          />
          <StatsCard
            iconColor={colors.mutedTeal}
            iconBackgroundColor="#E6F7FA"
            icon="active"
            label="Checked-In"
            value={checkedInVisitors.length}
            trend="Currently active inside the site"
            onPress={() => router.push("/site-manager-visitors")}
          />
          <StatsCard
            iconColor={colors.warning}
            iconBackgroundColor="#FBEDDB"
            icon="pending"
            label="Checked-Out"
            value={checkedOutVisitors.length}
            trend="Visits completed today"
            onPress={() => router.push("/site-manager-visitors")}
          />
          <StatsCard
            iconColor={colors.navyGrey}
            iconBackgroundColor="#E9EEF6"
            icon="users"
            label="Today's Visitors"
            value={totalVisitorsToday}
            trend="Recorded today for your assigned site"
            onPress={() => router.push("/site-manager-visitors")}
          />
        </View>

        <View style={styles.actions}>
          <ActionCard
            title="Visitors"
            subtitle="Search and review visitor records assigned to your site."
            icon="visitors"
            accentBackgroundColor="#FCE8E8"
            cardBackgroundColor="#FFF9F8"
            onPress={() => router.push("/site-manager-visitors")}
          />
          <ActionCard
            title="Reports"
            subtitle="Review visitor totals and recent activity for your site."
            icon="reports"
            accentBackgroundColor="#E6F7FA"
            cardBackgroundColor="#F7FCFD"
            onPress={() => router.push("/site-manager-reports")}
          />
        </View>

        <VisitListCard
          title="Recent Visitors"
          records={recentVisitors}
          emptyText="No visitors have been recorded for your site yet."
          onViewAll={() => router.push("/site-manager-visitors")}
          variant="upcoming"
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
  content: {
    padding: spacing.md,
    gap: spacing.md
  },
  assignedSiteCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    shadowColor: colors.navyInk,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  assignedSiteLabel: {
    color: colors.secondaryText,
    fontSize: 13,
    fontWeight: "700"
  },
  assignedSiteValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800"
  },
  metricGrid: {
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
