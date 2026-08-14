import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { useVmsData } from "../../hooks/use-vms-data";
import { colors, spacing } from "../../theme";
import { AppInput, Badge } from "../../ui/components";

function formatRole(role: string) {
  return role === "site_manager" ? "SITE MANAGER" : role.toUpperCase();
}

export function UsersDirectoryScreen() {
  return (
    <ProtectedRoute allowedRole="admin">
      <UsersDirectoryContent />
    </ProtectedRoute>
  );
}

function UsersDirectoryContent() {
  const { users } = useVmsData();
  const [query, setQuery] = useState("");
  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => {
      if (!normalized) {
        return true;
      }

      return [
        user.name,
        user.email,
        user.mobileNumber,
        user.employeeId,
        user.siteName,
        user.role
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [query, users]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Users</Text>
        <Pressable onPress={() => router.push("/admin-create-user")}>
          <Text style={styles.action}>Create</Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filteredUsers.length === 0 ? styles.emptyContainer : styles.content}
        ListHeaderComponent={
          <View style={styles.searchWrap}>
            <AppInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name, email, mobile, employee ID, or site"
            />
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.name}>{item.name}</Text>
              <Badge
                label={item.status === "active" ? formatRole(item.role) : "INACTIVE"}
                tone={item.status === "active" ? "info" : "warning"}
              />
            </View>
            <Text style={styles.meta}>{item.email}</Text>
            <Text style={styles.meta}>{item.mobileNumber || "No mobile number"}</Text>
            <Text style={styles.meta}>Employee ID: {item.employeeId || "Not assigned"}</Text>
            <Text style={styles.meta}>Site: {item.siteName || "Not assigned"}</Text>
            <View style={styles.actionsRow}>
              <Pressable onPress={() => router.push({ pathname: "/admin-create-user", params: { userId: item.id } })}>
                <Text style={styles.inlineAction}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => router.push({ pathname: "/admin-create-user", params: { mode: "password", userId: item.id } })}>
                <Text style={styles.inlineAction}>Change Password</Text>
              </Pressable>
            </View>
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
  action: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800"
  },
  content: {
    padding: spacing.md
  },
  searchWrap: {
    marginBottom: spacing.md
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl
  },
  emptyText: {
    color: colors.secondaryText
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: colors.navyInk,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
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
    marginTop: 4
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm
  },
  inlineAction: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800"
  }
});
