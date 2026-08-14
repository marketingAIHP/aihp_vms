import { router } from "expo-router";
import { Bell, BellOff, CircleX, Footprints, LogIn, QrCode } from "lucide-react-native";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { useVmsData } from "../../hooks/use-vms-data";
import { apiClient } from "../../lib/api-client";
import { colors, spacing } from "../../theme";
import type { NotificationItem } from "../../types/vms";

function notificationIcon(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("check-in")) {
    return LogIn;
  }
  if (normalized.includes("cancel")) {
    return CircleX;
  }
  if (normalized.includes("arrived")) {
    return Footprints;
  }
  if (normalized.includes("qr")) {
    return QrCode;
  }
  return Bell;
}

export function AdminNotificationsScreen() {
  return (
    <ProtectedRoute allowedRole="admin">
      <AdminNotificationsContent />
    </ProtectedRoute>
  );
}

function AdminNotificationsContent() {
  const { notifications, refresh } = useVmsData();
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = notifications.filter((item) => item.readBy.length === 0).length;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleMarkRead(item: NotificationItem) {
    if (item.readBy.length > 0) {
      return;
    }

    await apiClient.markNotificationRead(item.id);
    await refresh();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.unreadPill}>
          <Text style={styles.unreadText}>{unreadCount} unread</Text>
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <BellOff size={30} strokeWidth={2} color={colors.slateGrey} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>New operational alerts will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const unread = item.readBy.length === 0;
          const Icon = notificationIcon(item.title);

          return (
            <Pressable style={[styles.card, unread && styles.cardUnread]} onPress={() => void handleMarkRead(item)}>
              <View style={styles.leading}>
                <View style={styles.iconShell}>
                  <Icon size={20} strokeWidth={2} color={colors.primary} />
                </View>
                <View style={styles.copy}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {unread ? <View style={styles.dot} /> : null}
                  </View>
                  <Text style={styles.message}>{item.message}</Text>
                  <Text style={styles.timestamp}>
                    {new Date(item.createdAt).toLocaleDateString()} •{" "}
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
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
  unreadPill: {
    minWidth: 72,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center"
  },
  unreadText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800"
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
    marginBottom: spacing.sm,
    shadowColor: colors.navyInk,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  cardUnread: {
    borderColor: colors.primary
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
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    flex: 1
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
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary
  }
});
