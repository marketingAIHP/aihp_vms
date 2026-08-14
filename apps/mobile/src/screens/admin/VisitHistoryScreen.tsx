import { useMemo } from "react";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { useVmsData } from "../../hooks/use-vms-data";
import { colors, spacing } from "../../theme";
import { getTodayVisitHistory } from "./admin-utils";

export function VisitHistoryScreen() {
  return (
    <ProtectedRoute allowedRole="admin">
      <VisitHistoryContent />
    </ProtectedRoute>
  );
}

function VisitHistoryContent() {
  const { visits } = useVmsData();
  const records = useMemo(() => getTodayVisitHistory(visits), [visits]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Today Visit History</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={records.length === 0 ? styles.emptyContainer : styles.content}
        ListEmptyComponent={<Text style={styles.emptyText}>No visit history available today</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.visitorName}</Text>
            <Text style={styles.meta}>{item.siteManagerName} • {item.purpose}</Text>
            <Text style={styles.meta}>
              Check-In {item.checkedInAt ? new Date(item.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"} •
              Check-Out {item.checkedOutAt ? new Date(item.checkedOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}
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
  placeholder: {
    width: 44
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
