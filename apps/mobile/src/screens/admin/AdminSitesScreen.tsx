import { router } from "expo-router";
import { Building2, MapPin } from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { useVmsData } from "../../hooks/use-vms-data";
import { colors, spacing } from "../../theme";

export function AdminSitesScreen() {
  return (
    <ProtectedRoute allowedRole="admin">
      <AdminSitesContent />
    </ProtectedRoute>
  );
}

function AdminSitesContent() {
  const { masterData, refresh } = useVmsData();
  const [sites, setSites] = useState<Array<{ address: string; id: string; name: string }>>([]);

  useEffect(() => {
    setSites(masterData.buildings.map((name) => ({ address: "", id: name, name })));
    const baseUrl = process.env.EXPO_PUBLIC_WEB_BASE_URL?.replace(/\/$/, "");
    if (!baseUrl) return;
    let active = true;
    void fetch(`${baseUrl}/api/public/sites`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: { sites?: Array<{ address?: string; id: string; name: string }> }) => {
        if (active && payload.sites?.length) setSites(payload.sites.map((site) => ({ address: site.address ?? "", id: site.id, name: site.name })));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [masterData.buildings]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
        <Text style={styles.title}>Sites</Text>
        <Pressable onPress={() => void refresh()}><Text style={styles.refresh}>Refresh</Text></Pressable>
      </View>
      <FlatList
        data={sites}
        keyExtractor={(site) => site.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.summary}>
            <Building2 size={24} color={colors.primary} />
            <View><Text style={styles.summaryValue}>{sites.length}</Text><Text style={styles.summaryLabel}>Active sites</Text></View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>No active sites are available.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.icon}><MapPin size={20} color={colors.primary} /></View>
            <View style={styles.copy}>
              <Text style={styles.siteName}>{item.name}</Text>
              {item.address ? <Text style={styles.address}>{item.address}</Text> : null}
              <Text style={styles.status}>Active</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { color: colors.primary, fontSize: 15, fontWeight: "700" },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: "800" },
  refresh: { color: colors.secondaryText, fontSize: 13, fontWeight: "700" },
  list: { padding: spacing.md, gap: spacing.sm },
  summary: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm, borderRadius: 18, backgroundColor: colors.primarySoft },
  summaryValue: { color: colors.textPrimary, fontSize: 24, fontWeight: "800" },
  summaryLabel: { color: colors.secondaryText, fontSize: 13 },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground },
  icon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  copy: { flex: 1, gap: 3 },
  siteName: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  address: { color: colors.secondaryText, fontSize: 12, lineHeight: 17 },
  status: { color: colors.success, fontSize: 12, fontWeight: "700" },
  empty: { color: colors.secondaryText, textAlign: "center", padding: spacing.xl }
});
