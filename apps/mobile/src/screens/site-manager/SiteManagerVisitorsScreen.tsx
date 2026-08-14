import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useVmsData } from "../../hooks/use-vms-data";
import { colors, spacing } from "../../theme";
import { AppInput, Badge } from "../../ui/components";

export function SiteManagerVisitorsScreen() {
  const { session } = useAuth();
  const { visits } = useVmsData();
  const [query, setQuery] = useState("");

  const records = useMemo(() => {
    if (!session) {
      return [];
    }

    return visits.filter((visit) => {
      if (visit.building !== session.siteName) {
        return false;
      }

      if (!query.trim()) {
        return true;
      }

      const normalized = query.trim().toLowerCase();
      return [
        visit.visitorName,
        visit.mobile,
        visit.email,
        visit.company,
        visit.purpose
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [query, session, visits]);

  if (!session) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>My Visitors</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchPanel}>
        <AppInput value={query} onChangeText={setQuery} placeholder="Search visitors by name, phone, email, company, or purpose" />
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={records.length === 0 ? styles.emptyContainer : styles.content}
        ListEmptyComponent={<Text style={styles.emptyText}>No walk-in visitors are assigned to you yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.name}>{item.visitorName}</Text>
              <Badge label={item.status} tone={item.status === "CHECKED_IN" ? "success" : "neutral"} />
            </View>
            <Text style={styles.meta}>{item.company || "Walk-in"} • {item.purpose}</Text>
            <Text style={styles.meta}>
              {item.checkedInAt ? new Date(item.checkedInAt).toLocaleString() : new Date(item.createdAt).toLocaleString()}
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
  placeholder: {
    width: 44
  },
  content: {
    padding: spacing.md
  },
  searchPanel: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.screenBackground
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl
  },
  emptyText: {
    color: colors.secondaryText,
    fontSize: 14,
    textAlign: "center"
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm
  },
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
