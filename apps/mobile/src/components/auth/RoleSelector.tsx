import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SessionRole } from "../../store/session-store";
import { colors, radius, spacing } from "../../theme";

type RoleOption = {
  icon: string;
  value: SessionRole;
};

const roleOptions: RoleOption[] = [
  {
    value: "admin",
    icon: "A"
  },
  {
    value: "site_manager",
    icon: "S"
  }
];

function getRoleLabel(role: SessionRole) {
  if (role === "admin") {
    return "Admin";
  }
  if (role === "site_manager") {
    return "Site Manager";
  }
  return "Site Manager";
}

export function RoleSelector({
  selectedRole,
  onChange,
  compact = false
}: {
  selectedRole: SessionRole;
  onChange: (role: SessionRole) => void;
  compact?: boolean;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Select Role</Text>
      <View style={styles.cardStack}>
        {roleOptions.map((role) => {
          const isSelected = selectedRole === role.value;
          return (
            <Pressable
              key={role.value}
              onPress={() => onChange(role.value)}
              style={[styles.card, compact && styles.cardCompact, isSelected && styles.cardSelected]}
            >
              <View style={styles.cardContent}>
                <View style={[styles.iconShell, compact && styles.iconShellCompact, isSelected && styles.iconShellSelected]}>
                  <Text style={[styles.iconText, compact && styles.iconTextCompact, isSelected && styles.iconTextSelected]}>{role.icon}</Text>
                </View>
                <View style={styles.copy}>
                  <Text style={[styles.roleTitle, compact && styles.roleTitleCompact]}>{getRoleLabel(role.value)}</Text>
                </View>
              </View>
              {isSelected ? (
                <View style={styles.checkShell}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary
  },
  cardStack: {
    flexDirection: "row",
    gap: spacing.sm
  },
  card: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: spacing.md,
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  cardCompact: {
    minHeight: 68,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  iconShell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.inputBackground
  },
  iconShellCompact: {
    width: 34,
    height: 34,
    borderRadius: 10
  },
  iconShellSelected: {
    backgroundColor: "#FDECEC"
  },
  iconText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.secondaryText
  },
  iconTextCompact: {
    fontSize: 14
  },
  iconTextSelected: {
    color: colors.primary
  },
  copy: {
    flex: 1,
    justifyContent: "center"
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary
  },
  roleTitleCompact: {
    fontSize: 14
  },
  checkShell: {
    marginLeft: spacing.sm
  },
  checkIcon: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary
  }
});
