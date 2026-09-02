import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Activity, ChartColumnBig, CircleCheckBig, Users } from "lucide-react-native";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useVmsData } from "../../hooks/use-vms-data";
import { saveReportToDevice, type ReportExportFormat } from "../../lib/report-export";
import { colors, spacing } from "../../theme";
import { AppButton, Badge } from "../../ui/components";
import { countVisitsForToday, getActiveVisitors, getTodayVisitHistory } from "../admin/admin-utils";

export function SiteManagerReportsScreen() {
  const { session } = useAuth();
  const { visits } = useVmsData();
  const [format, setFormat] = useState<ReportExportFormat>("CSV");

  const records = useMemo(() => {
    if (!session) {
      return [];
    }

    return visits.filter((visit) => visit.building === session.siteName);
  }, [session, visits]);

  const visitorsToday = useMemo(() => countVisitsForToday(records), [records]);
  const checkedIn = useMemo(() => getActiveVisitors(records).length, [records]);
  const checkedOut = useMemo(() => getTodayVisitHistory(records).length, [records]);

  if (!session) {
    return null;
  }

  async function downloadReport() {
    if (!records.length) {
      Alert.alert("No records", "There are no visitor records to download for your assigned site.");
      return;
    }

    const rows = records.map((visit) => ({
      "Visitor Name": visit.visitorName,
      "Phone Number": visit.mobile || "-",
      Company: visit.company || "-",
      "Company To Visit": visit.companyToVisit || visit.building,
      "Person To Meet": visit.siteManagerName || "-",
      Site: visit.building,
      Purpose: visit.purpose || "-",
      "Vehicle Number": visit.vehicleNumber || "-",
      Status: visit.status.replaceAll("_", " "),
      "Check-In Time": visit.checkedInAt ? new Date(visit.checkedInAt).toLocaleString() : "-",
      "Check-Out Time": visit.checkedOutAt ? new Date(visit.checkedOutAt).toLocaleString() : "Not checked out"
    }));

    try {
      const filename = await saveReportToDevice({
        fileLabel: `AIHP_VMS_${session.siteName}_Visitor_Report`,
        format,
        metadata: {
          generatedAt: new Date().toLocaleString(),
          period: "All available visitor records",
          recordCount: rows.length,
          reportName: "AIHP VMS Site Visitor Report",
          site: session.siteName,
          siteManager: session.name
        },
        rows
      });
      Alert.alert("Report downloaded", `${filename} was saved to the selected device folder.`);
    } catch (error) {
      Alert.alert("Download failed", error instanceof Error ? error.message : "Unable to save the report.");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.header}>
              <Pressable onPress={() => router.back()}>
                <Text style={styles.back}>‹ Back</Text>
              </Pressable>
              <Text style={styles.title}>Reports</Text>
              <View style={styles.placeholder} />
            </View>
            <View style={styles.heroCard}>
              <View style={styles.heroAccentPrimary} />
              <View style={styles.heroAccentSecondary} />
              <Text style={styles.heroEyebrow}>Assigned Site</Text>
              <Text style={styles.heroTitle}>{session.siteName || "Not Assigned"}</Text>
              <Text style={styles.heroSubtitle}>Visitor activity and report insights for your current site.</Text>
            </View>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <View style={[styles.iconShell, { backgroundColor: "#FCE8E8" }]}>
                  <Users size={18} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.summaryValue}>{visitorsToday}</Text>
                <Text style={styles.summaryLabel}>Today's Visitors</Text>
              </View>
              <View style={styles.summaryCard}>
                <View style={[styles.iconShell, { backgroundColor: "#E6F7FA" }]}>
                  <Activity size={18} color={colors.mutedTeal} strokeWidth={2.2} />
                </View>
                <Text style={styles.summaryValue}>{checkedIn}</Text>
                <Text style={styles.summaryLabel}>Checked In</Text>
              </View>
              <View style={styles.summaryCard}>
                <View style={[styles.iconShell, { backgroundColor: "#FBEDDB" }]}>
                  <CircleCheckBig size={18} color={colors.warning} strokeWidth={2.2} />
                </View>
                <Text style={styles.summaryValue}>{checkedOut}</Text>
                <Text style={styles.summaryLabel}>Checked Out</Text>
              </View>
              <View style={styles.summaryCard}>
                <View style={[styles.iconShell, { backgroundColor: "#E9EEF6" }]}>
                  <ChartColumnBig size={18} color={colors.navyGrey} strokeWidth={2.2} />
                </View>
                <Text style={styles.summaryValue}>{records.length}</Text>
                <Text style={styles.summaryLabel}>Total Visitors</Text>
              </View>
            </View>
            <View style={styles.downloadCard}>
              <Text style={styles.downloadTitle}>Download Visitor Report</Text>
              <Text style={styles.downloadSubtitle}>The file includes only visitors for {session.siteName}.</Text>
              <View style={styles.formatRow}>
                {(["CSV", "Excel", "PDF"] as const).map((option) => (
                  <Pressable key={option} onPress={() => setFormat(option)} style={[styles.formatButton, format === option && styles.formatButtonSelected]}>
                    <Text style={[styles.formatText, format === option && styles.formatTextSelected]}>{option}</Text>
                  </Pressable>
                ))}
              </View>
              <AppButton title="Download Report" onPress={() => void downloadReport()} disabled={!records.length} />
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No visitor records are available for this site manager.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, item.status === "CHECKED_IN" ? styles.checkedInCard : styles.checkedOutCard]}>
            <View style={styles.rowBetween}>
              <Text style={styles.name}>{item.visitorName}</Text>
              <Badge label={item.status} tone={item.status === "CHECKED_IN" ? "success" : "neutral"} />
            </View>
            <Text style={styles.meta}>{item.company || "Walk-in"} • {item.purpose}</Text>
            <Text style={styles.meta}>{item.checkedInAt ? new Date(item.checkedInAt).toLocaleString() : new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
      />
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
  headerWrap: {
    gap: spacing.md,
    marginBottom: spacing.md
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  back: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800"
  },
  placeholder: {
    width: 44
  },
  heroCard: {
    borderRadius: 24,
    padding: spacing.lg,
    backgroundColor: colors.navyInk,
    overflow: "hidden",
    gap: spacing.xs,
    shadowColor: colors.navyInk,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5
  },
  heroAccentPrimary: {
    position: "absolute",
    width: 156,
    height: 156,
    borderRadius: 999,
    backgroundColor: "rgba(18,138,160,0.16)",
    top: -38,
    right: -34
  },
  heroAccentSecondary: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: "rgba(139,18,18,0.22)",
    bottom: -30,
    left: -18
  },
  heroEyebrow: {
    color: "rgba(240,232,224,0.82)",
    fontSize: 13,
    fontWeight: "700"
  },
  heroTitle: {
    color: colors.pureWhite,
    fontSize: 26,
    fontWeight: "800"
  },
  heroSubtitle: {
    color: "rgba(249,250,251,0.82)",
    fontSize: 14,
    lineHeight: 20
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  summaryCard: {
    width: "47%",
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    shadowColor: colors.navyInk,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  iconShell: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800"
  },
  summaryLabel: {
    color: colors.secondaryText,
    fontSize: 13,
    marginTop: spacing.xs
  },
  emptyText: {
    color: colors.secondaryText,
    fontSize: 14,
    textAlign: "center"
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
    shadowColor: colors.navyInk,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  checkedInCard: { backgroundColor: "#ecfdf5", borderColor: "#86efac" },
  checkedOutCard: { backgroundColor: "#fef2f2", borderColor: "#fca5a5" },
  downloadCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm
  },
  downloadTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: "800" },
  downloadSubtitle: { color: colors.secondaryText, fontSize: 13, lineHeight: 18 },
  formatRow: { flexDirection: "row", gap: spacing.sm },
  formatButton: { flex: 1, minHeight: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.cardBackground },
  formatButtonSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  formatText: { color: colors.secondaryText, fontSize: 13, fontWeight: "700" },
  formatTextSelected: { color: colors.primary },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  name: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    flex: 1
  },
  meta: {
    color: colors.secondaryText,
    fontSize: 13,
    lineHeight: 18
  }
});
