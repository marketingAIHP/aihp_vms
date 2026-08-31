import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { useVmsData } from "../../hooks/use-vms-data";
import { apiClient, type SiteDevice } from "../../lib/api-client";
import { colors, spacing } from "../../theme";
import { AppButton, AppInput } from "../../ui/components";

export function AdminDevicesScreen({ title = "Devices" }: { title?: string }) {
  return <ProtectedRoute allowedRole="admin"><AdminDevicesContent title={title} /></ProtectedRoute>;
}

function AdminDevicesContent({ title }: { title: string }) {
  const { masterData } = useVmsData();
  const [devices, setDevices] = useState<SiteDevice[]>([]);
  const [serialNumber, setSerialNumber] = useState("");
  const [siteName, setSiteName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const result = await apiClient.listSiteDevices();
      setDevices(result.devices);
    } catch (error) {
      Alert.alert("Unable to load devices", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDevices(); }, []);

  async function registerDevice() {
    if (!serialNumber.trim() || !siteName) return;
    setSaving(true);
    try {
      await apiClient.registerSiteDevice(serialNumber.trim(), siteName);
      setSerialNumber("");
      setSiteName("");
      await loadDevices();
      Alert.alert("Device registered", "The device has been assigned to the selected site.");
    } catch (error) {
      Alert.alert("Registration failed", error instanceof Error ? error.message : "Unable to register device.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={() => void loadDevices()}><Text style={styles.refresh}>Refresh</Text></Pressable>
      </View>
      <FlatList
        data={devices}
        keyExtractor={(device) => device.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<View style={styles.form}>
          <Text style={styles.formTitle}>Register Site Device</Text>
          <AppInput value={serialNumber} onChangeText={setSerialNumber} placeholder="Device serial number" />
          <Pressable style={styles.siteSelector} onPress={() => setSelectOpen(true)}><Text style={siteName ? styles.siteValue : styles.sitePlaceholder}>{siteName || "Select assigned site"}</Text><Text style={styles.chevron}>⌄</Text></Pressable>
          <AppButton title={saving ? "Registering..." : "Register Device"} disabled={!serialNumber.trim() || !siteName || saving} onPress={() => void registerDevice()} />
          <Text style={styles.sectionTitle}>Registered Devices</Text>
        </View>}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? "Loading devices..." : "No devices registered yet."}</Text>}
        renderItem={({ item }) => <View style={styles.deviceCard}><Text style={styles.serial}>{item.serial_number}</Text><Text style={styles.site}>{item.site_name}</Text><Text style={styles.date}>Registered {new Date(item.created_at).toLocaleString()}</Text></View>}
      />
      <Modal transparent visible={selectOpen} animationType="fade" onRequestClose={() => setSelectOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectOpen(false)}><View style={styles.modalCard}><Text style={styles.modalTitle}>Assign Site</Text><FlatList data={masterData.buildings} keyExtractor={(site) => site} renderItem={({ item }) => <Pressable style={styles.option} onPress={() => { setSiteName(item); setSelectOpen(false); }}><Text style={styles.optionText}>{item}</Text></Pressable>} ListEmptyComponent={<Text style={styles.empty}>No active sites available.</Text>} /></View></Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.border }, back: { color: colors.primary, fontSize: 15, fontWeight: "700" }, title: { color: colors.textPrimary, fontSize: 18, fontWeight: "800" }, refresh: { color: colors.secondaryText, fontSize: 13, fontWeight: "700" }, list: { padding: spacing.md, gap: spacing.sm }, form: { gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md, borderRadius: 18, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border }, formTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "800" }, siteSelector: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, siteValue: { color: colors.textPrimary, fontSize: 15 }, sitePlaceholder: { color: colors.secondaryText, fontSize: 15 }, chevron: { color: colors.secondaryText, fontSize: 16 }, sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: "800", marginTop: spacing.sm }, deviceCard: { padding: spacing.md, gap: 4, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground }, serial: { color: colors.textPrimary, fontSize: 16, fontWeight: "800" }, site: { color: colors.primary, fontSize: 14, fontWeight: "700" }, date: { color: colors.secondaryText, fontSize: 12 }, empty: { color: colors.secondaryText, textAlign: "center", padding: spacing.xl }, modalBackdrop: { flex: 1, backgroundColor: "rgba(17, 24, 39, 0.4)", justifyContent: "center", padding: spacing.lg }, modalCard: { maxHeight: "70%", borderRadius: 20, padding: spacing.md, backgroundColor: colors.cardBackground }, modalTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "800", marginBottom: spacing.sm }, option: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, optionText: { color: colors.textPrimary, fontSize: 15 }
});
