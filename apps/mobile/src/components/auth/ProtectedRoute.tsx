import { router } from "expo-router";
import { useEffect } from "react";
import type { PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { colors } from "../../theme";
import type { SessionRole } from "../../store/session-store";

export function ProtectedRoute({
  allowedRole,
  children
}: PropsWithChildren<{ allowedRole: SessionRole }>) {
  const { isHydrating, session } = useAuth();

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    if (!session) {
      router.replace("/login");
      return;
    }

    if (session.role !== allowedRole) {
      router.replace(session.role === "admin" ? "/admin" : "/site-manager");
    }
  }, [allowedRole, isHydrating, session]);

  if (isHydrating || !session || session.role !== allowedRole) {
    return (
      <View style={styles.loadingPage}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.screenBackground
  }
});
