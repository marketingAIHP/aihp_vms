import { useState } from "react";
import { Bell, LogOut } from "lucide-react-native";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { AIHPLogo } from "../branding/AIHPLogo";
import { colors, radius, spacing } from "../../theme";
import { AppButton } from "../../ui/components";

function getDisplayName(name: string) {
  return name
    .replace(/\b(admin|site manager|host)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function DashboardHeader({
  adminName,
  notificationCount,
  onNotificationPress,
  onLogout
}: {
  adminName: string;
  notificationCount: number;
  onNotificationPress: () => void;
  onLogout: () => Promise<void>;
}) {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirmLogout() {
    try {
      setIsSubmitting(true);
      await onLogout();
    } finally {
      setIsSubmitting(false);
      setConfirmVisible(false);
    }
  }

  return (
    <>
      <View style={styles.header}>
        <View style={styles.heroAccentPrimary} />
        <View style={styles.heroAccentSecondary} />
        <View style={styles.topRow}>
          <View style={styles.brandBlock}>
            <View style={styles.logoFrame}>
              <AIHPLogo size="sm" onDark />
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]} onPress={onNotificationPress}>
              <Bell size={22} strokeWidth={2} color="#0F172A" />
              {notificationCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{notificationCount > 9 ? "9+" : notificationCount}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]} onPress={() => setConfirmVisible(true)}>
              <LogOut size={22} strokeWidth={2} color="#0F172A" />
            </Pressable>
          </View>
        </View>
        <Text numberOfLines={1} style={styles.welcomeLine}>
          <Text style={styles.label}>Welcome, </Text>
          <Text style={styles.name}>{getDisplayName(adminName) || "AIHP User"}</Text>
        </Text>
      </View>

      <Modal animationType="fade" transparent visible={confirmVisible} onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalText}>Are you sure you want to logout?</Text>
            <View style={styles.modalActions}>
              <AppButton title="Cancel" variant="ghost" onPress={() => setConfirmVisible(false)} />
              <AppButton
                title={isSubmitting ? "Logging out..." : "Logout"}
                onPress={() => void handleConfirmLogout()}
                disabled={isSubmitting}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 118,
    backgroundColor: colors.navyInk,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: 28,
    shadowColor: colors.navyInk,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    overflow: "hidden"
  },
  heroAccentPrimary: {
    position: "absolute",
    width: 168,
    height: 168,
    borderRadius: 999,
    backgroundColor: "rgba(18,138,160,0.16)",
    top: -38,
    right: -34
  },
  heroAccentSecondary: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 30,
    backgroundColor: "rgba(139,18,18,0.22)",
    bottom: -36,
    left: -24
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: 6
  },
  brandBlock: {
    flex: 1,
    gap: 0
  },
  logoFrame: {
    alignSelf: "flex-start",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 14,
    paddingVertical: 6
  },
  label: {
    color: "rgba(240,232,224,0.82)",
    fontSize: 13,
    fontWeight: "600"
  },
  welcomeLine: {
    marginTop: -2
  },
  name: {
    color: colors.pureWhite,
    fontSize: 24,
    fontWeight: "800"
  },
  actions: {
    flexDirection: "row",
    gap: 12
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6EAF0",
    backgroundColor: colors.pureWhite,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: colors.navyInk,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  iconButtonPressed: {
    backgroundColor: colors.modernBeige,
    borderColor: "#D8DEE8"
  },
  badge: {
    position: "absolute",
    top: 7,
    right: 7,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4
  },
  badgeText: {
    color: colors.pureWhite,
    fontSize: 10,
    fontWeight: "800"
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.cardBackground,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800"
  },
  modalText: {
    color: colors.secondaryText,
    fontSize: 14,
    lineHeight: 21
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm
  }
});
