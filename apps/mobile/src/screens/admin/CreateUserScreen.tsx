import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { useVmsData } from "../../hooks/use-vms-data";
import { apiClient } from "../../lib/api-client";
import { colors, spacing } from "../../theme";
import { AppButton, AppInput } from "../../ui/components";

type ScreenMode = "details" | "password";

export function CreateUserScreen() {
  return (
    <ProtectedRoute allowedRole="admin">
      <CreateUserContent />
    </ProtectedRoute>
  );
}

function CreateUserContent() {
  const params = useLocalSearchParams<{ mode?: string; userId?: string }>();
  const { masterData, refresh, users } = useVmsData();
  const isEditMode = typeof params.userId === "string" && params.userId.length > 0;
  const mode: ScreenMode = params.mode === "password" ? "password" : "details";
  const existingUser = useMemo(
    () => users.find((item) => item.id === params.userId),
    [params.userId, users]
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [siteName, setSiteName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const siteOptions = masterData.buildings;

  useEffect(() => {
    if (!existingUser) {
      return;
    }

    setFullName(existingUser.name);
    setEmail(existingUser.email);
    setMobileNumber(existingUser.mobileNumber);
    setEmployeeId(existingUser.employeeId);
    setSiteName(existingUser.siteName);
  }, [existingUser]);

  const validationError = useMemo(() => {
    if (mode === "password") {
      if (!password.trim()) return "Password is required.";
      if (password.length < 8) return "Password must be at least 8 characters.";
      if (password !== confirmPassword) return "Password and confirm password must match.";
      return null;
    }

    if (!fullName.trim()) return "Full name is required.";
    if (!email.trim()) return "Email is required.";
    if (!siteName.trim()) return "Site is required.";
    if (!isEditMode && !password.trim()) return "Password is required.";
    if ((password || confirmPassword) && password.length < 8) return "Password must be at least 8 characters.";
    if ((password || confirmPassword) && password !== confirmPassword) return "Password and confirm password must match.";
    return null;
  }, [confirmPassword, email, fullName, isEditMode, mode, password, siteName]);

  async function handleSubmit() {
    if (validationError) {
      Alert.alert("Validation error", validationError);
      return;
    }

    if (mode === "password") {
      if (!existingUser) {
        Alert.alert("User not found", "Select a valid user before changing the password.");
        return;
      }

      try {
        setSubmitting(true);
        await apiClient.changeManagedUserPassword(existingUser.id, password);
        Alert.alert("Password updated", "The user password has been changed successfully.", [
          {
            text: "OK",
            onPress: () => router.back()
          }
        ]);
      } catch (error) {
        Alert.alert("Unable to update password", error instanceof Error ? error.message : "Unknown error");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      setSubmitting(true);

      if (isEditMode && existingUser) {
        await apiClient.updateManagedUser({
          email,
          employeeId,
          fullName,
          mobileNumber,
          siteName,
          userId: existingUser.id
        });

        if (password.trim()) {
          await apiClient.changeManagedUserPassword(existingUser.id, password);
        }
      } else {
        await apiClient.createManagedUser({
          email,
          employeeId,
          fullName,
          mobileNumber,
          password,
          role: "site_manager",
          siteName
        });
      }

      await refresh();
      Alert.alert(
        isEditMode ? "User updated" : "User created",
        isEditMode ? "The site manager details were saved successfully." : "The new site manager was saved in Supabase.",
        [
          {
            text: "OK",
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        isEditMode ? "Unable to update user" : "Unable to create user",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const title = mode === "password"
    ? "Change Password"
    : isEditMode
      ? "Edit User"
      : "Create User";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.back}>‹ Back</Text>
            </Pressable>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.placeholder} />
          </View>

          {mode === "details" ? (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Site Manager Details</Text>
              <AppInput value={fullName} onChangeText={setFullName} placeholder="Full Name" />
              <AppInput value={employeeId} onChangeText={setEmployeeId} placeholder="Employee ID" />
              <AppInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" />
              <AppInput value={mobileNumber} onChangeText={setMobileNumber} placeholder="Mobile Number" keyboardType="phone-pad" />

              <Text style={styles.fieldLabel}>Site</Text>
              <Pressable style={styles.selectField} onPress={() => setPickerVisible(true)}>
                <Text style={siteName ? styles.selectValue : styles.selectPlaceholder}>
                  {siteName || "Select Site"}
                </Text>
              </Pressable>

              <AppInput value={password} onChangeText={setPassword} placeholder={isEditMode ? "New Password (Optional)" : "Password"} secureTextEntry />
              <AppInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder={isEditMode ? "Confirm New Password" : "Confirm Password"} secureTextEntry />

              {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}

              <AppButton
                title={submitting ? "Saving..." : isEditMode ? "Save Changes" : "Create User"}
                onPress={() => void handleSubmit()}
                disabled={submitting}
              />
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>{existingUser?.name ?? "Selected User"}</Text>
              <Text style={styles.helperText}>Set a new password for this account.</Text>
              <AppInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
              <AppInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm Password" secureTextEntry />

              {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}

              <AppButton
                title={submitting ? "Updating..." : "Update Password"}
                onPress={() => void handleSubmit()}
                disabled={submitting}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal animationType="slide" transparent visible={pickerVisible} onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Site</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {siteOptions.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.optionRow, option === siteName && styles.optionRowActive]}
                  onPress={() => {
                    setSiteName(option);
                    setPickerVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, option === siteName && styles.optionTextActive]}>{option}</Text>
                </Pressable>
              ))}
              {siteOptions.length === 0 ? (
                <Text style={styles.emptyText}>No active sites are available.</Text>
              ) : null}
            </ScrollView>
            <AppButton title="Close" variant="ghost" onPress={() => setPickerVisible(false)} />
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
  page: {
    flex: 1
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
    fontSize: 20,
    fontWeight: "800"
  },
  placeholder: {
    width: 44
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: colors.navyInk,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  sectionLabel: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.xs
  },
  helperText: {
    color: colors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.xs
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginTop: spacing.xs
  },
  selectField: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.almostWhite,
    paddingHorizontal: spacing.md,
    paddingVertical: 16
  },
  selectPlaceholder: {
    color: colors.secondaryText,
    fontSize: 15
  },
  selectValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600"
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18
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
    maxHeight: "60%"
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
  },
  emptyText: {
    color: colors.secondaryText,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: spacing.md
  }
});
