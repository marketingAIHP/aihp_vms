import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../../theme";
import type { VisitRecord } from "../../types/vms";
import { Badge } from "../../ui/components";

type VisitListVariant = "upcoming" | "history" | "live";

function toneForStatus(status: VisitRecord["status"]): "neutral" | "info" | "success" | "warning" | "danger" {
  if (status === "CHECKED_IN") {
    return "success";
  }
  if (status === "CHECKED_OUT") {
    return "neutral";
  }
  return "info";
}

export function VisitListCard({
  emptyText,
  onViewAll,
  records,
  title,
  variant
}: {
  emptyText: string;
  onViewAll?: () => void;
  records: VisitRecord[];
  title: string;
  variant: VisitListVariant;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onViewAll ? (
          <Pressable onPress={onViewAll}>
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        ) : null}
      </View>

      {records.length === 0 ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : (
        <View style={styles.list}>
          {records.map((record) => (
            <View key={record.id} style={styles.row}>
              <View style={styles.copy}>
                <Text style={styles.name}>{record.visitorName}</Text>
                <Text style={styles.meta}>
                  {record.siteManagerName} • {record.purpose}
                </Text>
                {variant === "history" ? (
                  <Text style={styles.meta}>
                    In {record.checkedInAt ? new Date(record.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"} •
                    Out {record.checkedOutAt ? new Date(record.checkedOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}
                  </Text>
                ) : variant === "live" ? (
                  <Text style={styles.meta}>
                    {record.building} / {record.room} • Checked in{" "}
                    {record.checkedInAt ? new Date(record.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}
                  </Text>
                ) : (
                  <Text style={styles.meta}>
                    {new Date(record.createdAt).toLocaleDateString()} •{" "}
                    {new Date(record.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                )}
              </View>
              <Badge label={record.status} tone={toneForStatus(record.status)} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FCFCFD",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E9E6E0",
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: colors.navyInk,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "#F0ECE7"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    flex: 1
  },
  viewAll: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700"
  },
  emptyText: {
    color: colors.secondaryText,
    fontSize: 14,
    lineHeight: 21
  },
  list: {
    gap: spacing.sm
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEF1F4"
  },
  copy: {
    flex: 1,
    gap: 4
  },
  name: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  },
  meta: {
    color: colors.secondaryText,
    fontSize: 13,
    lineHeight: 18
  }
});
