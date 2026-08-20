import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../../theme";

export function SiteManagerSettingsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Visitor Policy</Text>
          <Text style={styles.copy}>
            Visitors must complete self-service registration using the check-in QR and must use the check-out QR before leaving the site.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Support</Text>
          <Text style={styles.copy}>For access issues or QR support, contact the Admin team.</Text>
          <Text style={styles.copy}>Email: support@aihpvms.local</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBackground
  },
  content: {
    padding: spacing.md,
    gap: spacing.md
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
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
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800"
  },
  copy: {
    color: colors.secondaryText,
    fontSize: 14,
    lineHeight: 20
  }
});
