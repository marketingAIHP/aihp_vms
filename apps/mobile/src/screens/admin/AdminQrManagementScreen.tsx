import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { useVmsData } from "../../hooks/use-vms-data";
import { colors, spacing } from "../../theme";
import { AppButton } from "../../ui/components";

const baseUrl = process.env.EXPO_PUBLIC_WEB_BASE_URL?.replace(/\/$/, "") || "";

function buildUrl(path: "checkin" | "checkout", siteToken: string) {
  return `${baseUrl}/${path}/${encodeURIComponent(siteToken)}`;
}

export function AdminQrManagementScreen() {
  return (
    <ProtectedRoute allowedRole="admin">
      <AdminQrManagementContent />
    </ProtectedRoute>
  );
}

function AdminQrManagementContent() {
  const { masterData } = useVmsData();
  const [selectedSite, setSelectedSite] = useState("");
  const [sitePickerVisible, setSitePickerVisible] = useState(false);
  const [availableSites, setAvailableSites] = useState<string[]>([]);

  useEffect(() => {
    setAvailableSites(masterData.buildings);
    if (!baseUrl) return;
    let active = true;
    void fetch(`${baseUrl}/api/public/sites`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: { sites?: Array<{ name: string }> }) => {
        if (active && payload.sites?.length) setAvailableSites(payload.sites.map((site) => site.name));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [masterData.buildings]);

  useEffect(() => {
    if (!selectedSite && availableSites[0]) {
      setSelectedSite(availableSites[0]);
    }
  }, [availableSites, selectedSite]);

  const checkInUrl = useMemo(() => buildUrl("checkin", selectedSite || "main"), [selectedSite]);
  const checkOutUrl = useMemo(() => buildUrl("checkout", selectedSite || "main"), [selectedSite]);

  async function shareUrl(title: string, url: string) {
    await Share.share({
      title,
      message: url
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>QR Management</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.siteCard}>
          <Text style={styles.cardTitle}>Selected Site</Text>
          <Pressable style={styles.selectField} onPress={() => setSitePickerVisible(true)}>
            <Text style={selectedSite ? styles.selectValue : styles.selectPlaceholder}>
              {selectedSite || "Select Site"}
            </Text>
            <Text style={styles.selectChevron}>⌄</Text>
          </Pressable>
        </View>

        {baseUrl ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Check-In URL</Text>
              <Text style={styles.url}>{checkInUrl}</Text>
              <View style={styles.buttonRow}>
                <AppButton title="Share URL" onPress={() => void shareUrl("Check-In URL", checkInUrl)} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Check-Out URL</Text>
              <Text style={styles.url}>{checkOutUrl}</Text>
              <View style={styles.buttonRow}>
                <AppButton title="Share URL" onPress={() => void shareUrl("Check-Out URL", checkOutUrl)} />
              </View>
            </View>
          </>
        ) : (
          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Public web URL required</Text>
            <Text style={styles.noteText}>
              Set `EXPO_PUBLIC_WEB_BASE_URL` in `apps/mobile/.env` to your deployed web app URL and restart Expo.
            </Text>
            <Text style={styles.noteText}>Example: `https://your-domain.vercel.app`</Text>
          </View>
        )}

      </View>

      <Modal animationType="slide" transparent visible={sitePickerVisible} onRequestClose={() => setSitePickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Site</Text>
            <ScrollView>
              {availableSites.map((site) => (
                <Pressable
                  key={site}
                  style={[styles.optionRow, site === selectedSite && styles.optionRowActive]}
                  onPress={() => {
                    setSelectedSite(site);
                    setSitePickerVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, site === selectedSite && styles.optionTextActive]}>{site}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <AppButton title="Close" variant="ghost" onPress={() => setSitePickerVisible(false)} />
          </View>
        </View>
      </Modal>
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
    gap: spacing.md
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm
  },
  siteCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm
  },
  selectField: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.almostWhite,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  selectValue: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600"
  },
  selectPlaceholder: {
    flex: 1,
    color: colors.secondaryText,
    fontSize: 15
  },
  selectChevron: {
    color: colors.secondaryText,
    fontSize: 16,
    fontWeight: "700"
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800"
  },
  url: {
    color: colors.secondaryText,
    fontSize: 13,
    lineHeight: 20
  },
  buttonRow: {
    gap: spacing.sm
  },
  noteCard: {
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs
  },
  noteTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  },
  noteText: {
    color: colors.secondaryText,
    fontSize: 13,
    lineHeight: 19
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.35)",
    justifyContent: "flex-end"
  },
  modalCard: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
    gap: spacing.md,
    maxHeight: "70%"
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800"
  },
  optionRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  optionRowActive: {
    backgroundColor: colors.primarySoft
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600"
  },
  optionTextActive: {
    color: colors.primary
  }
});
