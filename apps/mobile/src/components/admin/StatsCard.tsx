import type { LucideIcon } from "lucide-react-native";
import { Activity, Clock3, ShieldCheck, Users } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../theme";

type StatsIconName = "visits" | "active" | "pending" | "users";

const iconMap: Record<StatsIconName, LucideIcon> = {
  visits: Users,
  active: Activity,
  pending: Clock3,
  users: ShieldCheck
};

export function StatsCard({
  iconColor,
  iconBackgroundColor,
  icon,
  label,
  value,
  trend,
  onPress
}: {
  iconColor: string;
  iconBackgroundColor?: string;
  icon: StatsIconName;
  label: string;
  value: number;
  trend: string;
  onPress: () => void;
}) {
  const IconComponent = iconMap[icon];

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={[styles.iconShell, iconBackgroundColor ? { backgroundColor: iconBackgroundColor } : null]}>
        <IconComponent size={22} strokeWidth={2} color={iconColor} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.trend}>{trend}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navyInk,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    gap: spacing.xs
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  iconShell: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: "#F1E4DE"
  },
  value: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "800"
  },
  label: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  },
  trend: {
    color: colors.secondaryText,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17
  }
});
