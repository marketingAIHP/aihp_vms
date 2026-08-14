import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AIHPLogo } from "../components/branding/AIHPLogo";
import { RoleSelector } from "../components/auth/RoleSelector";
import { useAuth } from "../context/AuthContext";
import { type SessionRole } from "../store/session-store";
import { colors, spacing } from "../theme";

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function LoginScreen() {
  const { login } = useAuth();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState<SessionRole>("site_manager");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const shortestSide = Math.min(width, height);
  const isLandscape = width > height;
  const contentWidth = Math.min(width * 0.92, 560);
  const titleSize = Math.max(20, Math.min(shortestSide * 0.085, 28));
  const subtitleSize = Math.max(13, Math.min(shortestSide * 0.043, 16));
  const inputFontSize = Math.max(15, Math.min(shortestSide * 0.045, 17));
  const sectionGap = isLandscape ? 10 : shortestSide <= 360 ? 12 : 16;
  const cardPadding = isLandscape ? 14 : shortestSide <= 360 ? 14 : 18;
  const screenPadding = isLandscape ? 12 : shortestSide <= 360 ? 10 : 16;
  const compactRoles = shortestSide < 430 || isLandscape;
  const headerGap = isLandscape ? 6 : shortestSide <= 360 ? 8 : 10;
  const safeTopPadding = Math.max(insets.top, Platform.OS === "android" ? 8 : 0);

  const emailError = useMemo(() => {
    if (!touched.email) {
      return "";
    }
    if (!email.trim()) {
      return "Email address is required.";
    }
    if (!validateEmail(email)) {
      return "Enter a valid email address.";
    }
    return "";
  }, [email, touched.email]);

  const passwordError = useMemo(() => {
    if (!touched.password) {
      return "";
    }
    if (!password.trim()) {
      return "Password is required.";
    }
    if (password.trim().length < 8) {
      return "Password must be at least 8 characters.";
    }
    return "";
  }, [password, touched.password]);

  const isFormValid = !emailError && !passwordError && email.trim() && password.trim().length >= 8;

  async function handleSubmit() {
    setTouched({ email: true, password: true });
    if (!isFormValid) {
      return;
    }

    try {
      setSubmitting(true);
      await login(email.trim(), password, selectedRole);
      router.replace(selectedRole === "admin" ? "/admin" : "/site-manager");
    } catch (error) {
      Alert.alert("Sign in failed", error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboard}>
        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: safeTopPadding + (isLandscape ? 6 : 10),
              paddingBottom: screenPadding,
              paddingHorizontal: Math.max(16, Math.min(width * 0.04, 24))
            }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.screenFrame, { width: contentWidth }]}>
            <View style={[styles.screen, { gap: sectionGap }]}>
              <View style={[styles.header, { gap: headerGap }]}>
                <View style={styles.heroCard}>
                  <View style={styles.heroAccentPrimary} />
                  <View style={styles.heroAccentSecondary} />
                  <View style={styles.logoFrame}>
                    <AIHPLogo size={shortestSide <= 360 ? "md" : "lg"} onDark />
                  </View>
                  <Text style={[styles.appName, styles.heroTitle, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.2) }]}>
                    Visitor Management System
                  </Text>
                  <Text style={[styles.subtitle, styles.heroSubtitle, { fontSize: subtitleSize, lineHeight: Math.round(subtitleSize * 1.35) }]}>
                    Secure Visitor Access &amp; Building Operations
                  </Text>
                </View>
              </View>

              <View style={[styles.loginCard, { padding: cardPadding, gap: Math.max(12, cardPadding - 4) }]}>
                <Text style={[styles.cardTitle, { fontSize: Math.max(22, Math.min(shortestSide * 0.085, 32)) }]}>Sign In</Text>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { fontSize: Math.max(14, Math.min(shortestSide * 0.046, 16)) }]}>Email Address</Text>
                  <View style={[styles.inputShell, emailError ? styles.inputError : null, { minHeight: isLandscape ? 50 : 54 }]}>
                    <Text style={styles.leadingIcon}>@</Text>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                      onChangeText={setEmail}
                      placeholder="Enter your email"
                      placeholderTextColor={colors.secondaryText}
                      style={[styles.input, { fontSize: inputFontSize }]}
                      value={email}
                    />
                  </View>
                  {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { fontSize: Math.max(14, Math.min(shortestSide * 0.046, 16)) }]}>Password</Text>
                  <View style={[styles.inputShell, passwordError ? styles.inputError : null, { minHeight: isLandscape ? 50 : 54 }]}>
                    <Text style={styles.leadingIcon}>*</Text>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      placeholderTextColor={colors.secondaryText}
                      secureTextEntry={!showPassword}
                      style={[styles.input, { fontSize: inputFontSize }]}
                      value={password}
                    />
                    <Pressable hitSlop={10} onPress={() => setShowPassword((current) => !current)}>
                      <Text style={styles.toggleText}>{showPassword ? "Hide" : "Show"}</Text>
                    </Pressable>
                  </View>
                  {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                </View>

                <Pressable
                  disabled={submitting || !isFormValid}
                  onPress={() => void handleSubmit()}
                  style={[styles.primaryButton, { minHeight: isLandscape ? 50 : 54 }, (!isFormValid || submitting) && styles.primaryButtonDisabled]}
                >
                  {submitting ? <ActivityIndicator color={colors.cardBackground} /> : <Text style={[styles.primaryButtonText, { fontSize: Math.max(15, Math.min(shortestSide * 0.047, 17)) }]}>Sign In</Text>}
                </Pressable>

                <Pressable onPress={() => router.push("/reception-mode")} style={styles.receptionButton}>
                  <Text style={[styles.receptionText, { fontSize: Math.max(13, Math.min(shortestSide * 0.042, 15)) }]}>
                    Visitor Check-In / Check-Out
                  </Text>
                </Pressable>
              </View>

              <RoleSelector compact={compactRoles} onChange={setSelectedRole} selectedRole={selectedRole} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBackground
  },
  keyboard: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  screen: {
    width: "100%",
    maxWidth: 560
  },
  screenFrame: {
    width: "100%"
  },
  header: {
    alignItems: "center",
    alignSelf: "stretch"
  },
  heroCard: {
    width: "100%",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: colors.navyInk,
    borderWidth: 1,
    borderColor: "rgba(18,138,160,0.24)",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: colors.navyInk,
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6
  },
  heroAccentPrimary: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: "rgba(18,138,160,0.18)",
    top: -40,
    right: -30
  },
  heroAccentSecondary: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: "rgba(139,18,18,0.26)",
    bottom: -24,
    left: -18
  },
  logoFrame: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.04)"
  },
  appName: {
    textAlign: "center",
    fontWeight: "800",
    color: colors.textPrimary
  },
  heroTitle: {
    color: colors.pureWhite
  },
  subtitle: {
    textAlign: "center",
    color: colors.secondaryText
  },
  heroSubtitle: {
    color: "rgba(249,250,251,0.82)"
  },
  loginCard: {
    width: "100%",
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFE5DF",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  cardTitle: {
    fontWeight: "800",
    color: colors.textPrimary
  },
  fieldGroup: {
    gap: 8
  },
  label: {
    fontWeight: "700",
    color: colors.textPrimary
  },
  inputShell: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.almostWhite,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md
  },
  inputError: {
    borderColor: colors.primary
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    minWidth: 0
  },
  leadingIcon: {
    width: 20,
    textAlign: "center",
    color: colors.secondaryText,
    fontSize: 16,
    fontWeight: "700"
  },
  toggleText: {
    color: colors.navyGrey,
    fontSize: 13,
    fontWeight: "700"
  },
  errorText: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 16
  },
  primaryButton: {
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonDisabled: {
    opacity: 0.55
  },
  primaryButtonText: {
    color: colors.cardBackground,
    fontWeight: "800"
  },
  receptionButton: {
    alignSelf: "center",
    paddingVertical: 4
  },
  receptionText: {
    color: colors.primary,
    fontWeight: "700"
  }
});
