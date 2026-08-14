import { router } from "expo-router";
import { Bell, BellOff, Footprints, LogIn } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useVmsData } from "../../hooks/use-vms-data";
import { apiClient } from "../../lib/api-client";
import { colors, spacing } from "../../theme";

function notificationIcon(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("checked out")) {
    return Footprints;
  }
  if (normalized.includes("checked in")) {
    return LogIn;
  }
  return Bell;
}

export function SiteManagerNotificationsScreen() {
  const { session } = useAuth();
  const { notifications, refresh } = useVmsData();
  const [refreshing, setRefreshing] = useState(false);

  const siteNotifications = useMemo(
    () => notifications.filter((item) => item.targetRoles.includes("site_manager")),
    [notifications]
  );

  if (!session) {
    return null;
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleMarkRead(notificationId: string) {
    await apiClient.markNotificationRead(notificationId);
    await refresh();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={siteNotifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={siteNotifications.length === 0 ? styles.emptyContainer : styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <BellOff size={30} strokeWidth={2} color={colors.slateGrey} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>Visitor alerts for your assigned site will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const Icon = notificationIcon(item.title);
          return (
            <Pressable style={styles.card} onPress={() => void handleMarkRead(item.id)}>
              <View style={styles.leading}>
                <View style={styles.iconShell}>
                  <Icon size={20} strokeWidth={2} color={colors.primary} />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.message}>{item.message}</Text>
                  <Text style={styles.timestamp}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
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
    padding: spacing.md,
    gap: spacing.sm
  },
  emptyContainer: {
    flexGrow: 1
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.sm
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800"
  },
  emptyText: {
    color: colors.secondaryText,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  leading: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  iconShell: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1,
    gap: 4
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  },
  message: {
    color: colors.secondaryText,
    fontSize: 13,
    lineHeight: 18
  },
  timestamp: {
    color: colors.coolGrey,
    fontSize: 12,
    fontWeight: "600"
  }
});
