import type { LucideIcon } from "lucide-react-native";
import { Building2, ChevronRight, FileBarChart2, QrCode, Settings, Users, UsersRound } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../../theme";

type ActionIconName = "users" | "reports" | "qr" | "visitors" | "settings" | "sites";

const iconMap: Record<ActionIconName, LucideIcon> = {
  users: UsersRound,
  reports: FileBarChart2,
  qr: QrCode,
  visitors: Users,
  settings: Settings,
  sites: Building2
};

export function ActionCard({
  title,
  subtitle,
  icon,
  accentBackgroundColor,
  cardBackgroundColor,
  onPress
}: {
  title: string;
  subtitle: string;
  icon: ActionIconName;
  accentBackgroundColor?: string;
  cardBackgroundColor?: string;
  onPress: () => void;
}) {
  const IconComponent = iconMap[icon];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        cardBackgroundColor ? { backgroundColor: cardBackgroundColor } : null,
        pressed && styles.cardPressed
      ]}
      onPress={onPress}
    >
      <View style={styles.leading}>
        <View style={[styles.iconShell, accentBackgroundColor ? { backgroundColor: accentBackgroundColor } : null]}>
          <IconComponent size={22} strokeWidth={2} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      <ChevronRight size={20} strokeWidth={2.2} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E9E6E0",
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: colors.navyInk,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.995 }]
  },
  leading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1
  },
  iconShell: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F5D9D9"
  },
  copy: {
    flex: 1,
    gap: 2
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
    maxWidth: "96%"
  }
});
