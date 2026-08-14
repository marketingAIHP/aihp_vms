import { LinearGradient } from "expo-linear-gradient";
import type { PropsWithChildren, ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type ScrollViewProps,
  type TextInputProps,
  type ViewStyle
} from "react-native";
import { colors, radius, spacing } from "../theme";

export function AppScreen({
  children,
  contentContainerStyle,
  ...props
}: PropsWithChildren<ScrollViewProps>) {
  return (
    <LinearGradient colors={[colors.almostWhite, colors.modernBeige]} style={styles.page}>
      <ScrollView
        {...props}
        style={styles.page}
        contentContainerStyle={[styles.content, contentContainerStyle]}
      >
        {children}
      </ScrollView>
    </LinearGradient>
  );
}

export function Panel({
  children,
  style
}: PropsWithChildren<{ style?: ViewStyle | ViewStyle[] }>) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function SectionTitle({
  title,
  subtitle,
  right
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function MetricCard({
  label,
  value,
  accent = colors.navyInk
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function AppButton({
  title,
  variant = "primary",
  ...props
}: PressableProps & {
  title: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "ghost" && styles.buttonGhost,
        props.disabled && styles.buttonDisabled,
        pressed && !props.disabled && styles.buttonPressed,
        typeof props.style === "function" ? undefined : props.style
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "primary" && styles.buttonTextPrimary,
          variant === "secondary" && styles.buttonTextSecondary,
          variant === "ghost" && styles.buttonTextGhost
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function AppInput(props: TextInputProps) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={colors.coolGrey}
      style={[styles.input, typeof props.style === "function" ? undefined : props.style]}
    />
  );
}

export function Badge({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
}) {
  const toneStyle =
    tone === "info"
      ? styles.badgeInfo
      : tone === "success"
        ? styles.badgeSuccess
        : tone === "warning"
          ? styles.badgeWarning
          : tone === "danger"
            ? styles.badgeDanger
            : styles.badgeNeutral;

  const textTone =
    tone === "danger"
      ? styles.badgeTextDanger
      : tone === "warning"
        ? styles.badgeTextWarning
        : tone === "success"
          ? styles.badgeTextSuccess
          : tone === "info"
            ? styles.badgeTextInfo
            : styles.badgeTextNeutral;

  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={[styles.badgeText, textTone]}>{label}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  page: {
    flex: 1
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.md
  },
  panel: {
    backgroundColor: colors.pureWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navyInk,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: spacing.xs
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.navyInk
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.coolGrey
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.pureWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "800"
  },
  metricLabel: {
    marginTop: spacing.xs,
    color: colors.coolGrey,
    fontSize: 13
  },
  button: {
    minHeight: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  buttonPrimary: {
    backgroundColor: colors.burgundy
  },
  buttonSecondary: {
    backgroundColor: colors.navyInk
  },
  buttonGhost: {
    backgroundColor: colors.modernBeige
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonPressed: {
    opacity: 0.86
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700"
  },
  buttonTextPrimary: {
    color: colors.pureWhite
  },
  buttonTextSecondary: {
    color: colors.pureWhite
  },
  buttonTextGhost: {
    color: colors.navyInk
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.navyInk,
    backgroundColor: colors.almostWhite
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  badgeNeutral: {
    backgroundColor: "#E8EEF2"
  },
  badgeInfo: {
    backgroundColor: "#D7EFF3"
  },
  badgeSuccess: {
    backgroundColor: "#D8F3EE"
  },
  badgeWarning: {
    backgroundColor: "#FBE7D0"
  },
  badgeDanger: {
    backgroundColor: "#F8D7D7"
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700"
  },
  badgeTextNeutral: {
    color: colors.navyGrey
  },
  badgeTextInfo: {
    color: colors.mutedTeal
  },
  badgeTextSuccess: {
    color: colors.success
  },
  badgeTextWarning: {
    color: colors.warning
  },
  badgeTextDanger: {
    color: colors.danger
  },
  divider: {
    height: 1,
    backgroundColor: colors.border
  }
});

