import { router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { useVmsData } from "../../hooks/use-vms-data";
import { colors, spacing } from "../../theme";
import type { VisitRecord } from "../../types/vms";
import { Badge } from "../../ui/components";
import { getRecentCheckIns } from "./admin-utils";

function tone(status: VisitRecord["status"]): "neutral" | "info" | "success" | "warning" | "danger" {
  if (status === "CHECKED_IN") return "success";
  return "neutral";
}

export function AdminVisitRecordsScreen({
  emptyText,
  filter,
  title
}: {
  emptyText: string;
  filter: (records: VisitRecord[]) => VisitRecord[];
  title: string;
}) {
  return (
    <ProtectedRoute allowedRole="admin">
      <AdminVisitRecordsContent emptyText={emptyText} filter={filter} title={title} />
    </ProtectedRoute>
  );
}

function AdminVisitRecordsContent({
  emptyText,
  filter,
  title
}: {
  emptyText: string;
  filter: (records: VisitRecord[]) => VisitRecord[];
  title: string;
}) {
  const { error, loading, refresh, visits } = useVmsData();
  const records = useMemo(() => filter(visits), [filter, visits]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={() => void refresh()}>
          <Text style={styles.refresh}>Refresh</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={records.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>{emptyText}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.name}>{item.visitorName}</Text>
              <Badge label={item.status} tone={tone(item.status)} />
            </View>
            <Text style={styles.meta}>{item.siteManagerName} • {item.company}</Text>
            <Text style={styles.meta}>{item.purpose} • {item.building} / {item.room}</Text>
            <Text style={styles.meta}>
              {new Date(item.createdAt).toLocaleDateString()} •{" "}
              {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

export function allVisitsFilter(records: VisitRecord[]) {
  return [...records].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

export { getRecentCheckIns as recentCheckInsFilter };

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBackground
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
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
  refresh: {
    color: colors.secondaryText,
    fontSize: 13,
    fontWeight: "700"
  },
  centered: {
    paddingTop: spacing.md
  },
  error: {
    color: colors.danger,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl
  },
  emptyText: {
    color: colors.secondaryText,
    fontSize: 15,
    textAlign: "center"
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs
  },
  rowBetween: {
    flexDirection: "row",
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
