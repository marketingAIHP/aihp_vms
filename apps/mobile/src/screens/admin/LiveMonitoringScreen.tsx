import { useEffect, useMemo } from "react";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { useVmsData } from "../../hooks/use-vms-data";
import { supabase } from "../../lib/supabase";
import { colors, spacing } from "../../theme";
import { getActiveVisitors } from "./admin-utils";

export function LiveMonitoringScreen() {
  return (
    <ProtectedRoute allowedRole="admin">
      <LiveMonitoringContent />
    </ProtectedRoute>
  );
}

function LiveMonitoringContent() {
  const { refresh, visits } = useVmsData();
  const liveVisitors = useMemo(() => getActiveVisitors(visits), [visits]);

  useEffect(() => {
    const channel = supabase
      .channel("live-monitoring-visits")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visits" },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Live Monitoring</Text>
        <Pressable onPress={() => void refresh()}>
          <Text style={styles.refresh}>Refresh</Text>
        </Pressable>
      </View>

      <FlatList
        data={liveVisitors}
        keyExtractor={(item) => item.id}
        contentContainerStyle={liveVisitors.length === 0 ? styles.emptyContainer : styles.content}
        ListEmptyComponent={<Text style={styles.emptyText}>No active visitors are currently inside.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.visitorName}</Text>
            <Text style={styles.meta}>Status: {item.status.replaceAll("_", " ")}</Text>
            <Text style={styles.meta}>Location: {item.building} / {item.room}</Text>
            <Text style={styles.meta}>Site Manager: {item.siteManagerName}</Text>
            <Text style={styles.meta}>
              Check-In Time:{" "}
              {item.checkedInAt
                ? new Date(item.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "--"}
            </Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  content: {
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
    marginBottom: spacing.sm
  },
  name: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  meta: {
    color: colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4
  }
});
