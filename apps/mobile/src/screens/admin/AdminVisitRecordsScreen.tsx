import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { useVmsData } from "../../hooks/use-vms-data";
import { apiClient } from "../../lib/api-client";
import { colors, spacing } from "../../theme";
import type { VisitRecord } from "../../types/vms";
import { AppButton, AppInput, Badge } from "../../ui/components";
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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<VisitRecord["status"] | "">("");
  const [site, setSite] = useState("");
  const [openFilter, setOpenFilter] = useState<"status" | "site" | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<VisitRecord | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const sourceRecords = useMemo(() => filter(visits), [filter, visits]);
  const sites = useMemo(
    () => Array.from(new Set(sourceRecords.map((record) => record.building).filter(Boolean))).sort(),
    [sourceRecords]
  );
  const records = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sourceRecords.filter((record) => {
      if (status && record.status !== status) return false;
      if (site && record.building !== site) return false;
      if (!normalized) return true;
      return [record.visitorName, record.mobile, record.company, record.siteManagerName, record.purpose, record.building]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [query, site, sourceRecords, status]);

  function openEditor(visit: VisitRecord) {
    setSelectedVisit(visit);
    setEditNotes(visit.notes ?? "");
  }

  async function saveVisitorNotes() {
    if (!selectedVisit || !editNotes.trim()) return;
    setActionPending(true);
    try {
      await apiClient.updateVisitNotes(selectedVisit.id, editNotes);
      await refresh();
      setSelectedVisit(null);
      Alert.alert("Visitor updated", "Visitor notes were saved successfully.");
    } catch (actionError) {
      Alert.alert("Update failed", actionError instanceof Error ? actionError.message : "Unable to update visitor.");
    } finally {
      setActionPending(false);
    }
  }

  function confirmCheckOut(visit: VisitRecord) {
    Alert.alert("Check out visitor?", `Complete check-out for ${visit.visitorName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Check Out",
        onPress: () => {
          setActionPending(true);
          void apiClient.checkOutVisit(visit.id)
            .then(refresh)
            .then(() => Alert.alert("Check-out complete", `${visit.visitorName} has been checked out.`))
            .catch((actionError: unknown) => Alert.alert("Check-out failed", actionError instanceof Error ? actionError.message : "Unable to check out visitor."))
            .finally(() => setActionPending(false));
        }
      }
    ]);
  }

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
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.filters}>
            <AppInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search visitor, phone, company, person, or site"
            />
            <View style={styles.filterRow}>
              <Pressable style={styles.filterButton} onPress={() => setOpenFilter("status")}>
                <Text style={styles.filterText}>{status ? status.replaceAll("_", " ") : "All Statuses"}</Text>
                <Text style={styles.chevron}>⌄</Text>
              </Pressable>
              <Pressable style={styles.filterButton} onPress={() => setOpenFilter("site")}>
                <Text numberOfLines={1} style={styles.filterText}>{site || "All Sites"}</Text>
                <Text style={styles.chevron}>⌄</Text>
              </Pressable>
            </View>
          </View>
        }
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
            <View style={styles.actionRow}>
              <AppButton title="Edit" variant="ghost" style={styles.actionButton} onPress={() => openEditor(item)} />
              {item.status === "CHECKED_IN" ? (
                <AppButton title="Check Out" style={styles.actionButton} disabled={actionPending} onPress={() => confirmCheckOut(item)} />
              ) : null}
            </View>
          </View>
        )}
      />

      <Modal animationType="fade" transparent visible={Boolean(openFilter)} onRequestClose={() => setOpenFilter(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpenFilter(null)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>{openFilter === "status" ? "Filter by status" : "Filter by site"}</Text>
            <FlatList
              data={openFilter === "status" ? ["", "CHECKED_IN", "CHECKED_OUT"] : ["", ...sites]}
              keyExtractor={(item) => item || "all"}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    if (openFilter === "status") setStatus(item as VisitRecord["status"] | "");
                    else setSite(item);
                    setOpenFilter(null);
                  }}
                >
                  <Text style={styles.optionText}>{item ? item.replaceAll("_", " ") : openFilter === "status" ? "All Statuses" : "All Sites"}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal animationType="fade" transparent visible={Boolean(selectedVisit)} onRequestClose={() => setSelectedVisit(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit visitor details</Text>
            <Text style={styles.name}>{selectedVisit?.visitorName}</Text>
            <AppInput
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="Update notes or visit comments"
              style={styles.notesInput}
            />
            <AppButton title={actionPending ? "Saving..." : "Save Changes"} disabled={actionPending || !editNotes.trim()} onPress={() => void saveVisitorNotes()} />
            <AppButton title="Cancel" variant="ghost" disabled={actionPending} onPress={() => setSelectedVisit(null)} />
          </View>
        </View>
      </Modal>
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
  filters: {
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  filterButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs
  },
  filterText: {
    color: colors.textPrimary,
    fontSize: 13,
    flex: 1
  },
  chevron: {
    color: colors.secondaryText,
    fontSize: 16
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
    textAlign: "center",
    paddingVertical: spacing.xl
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(5, 22, 34, 0.55)"
  },
  modalCard: {
    maxHeight: "70%",
    borderRadius: 22,
    backgroundColor: colors.cardBackground,
    padding: spacing.md
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.sm
  },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: 15
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
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  actionButton: {
    flex: 1
  },
  notesInput: {
    minHeight: 120
  }
});
