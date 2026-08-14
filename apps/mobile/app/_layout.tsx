import { Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { MobileQueryProvider } from "../src/providers/query-provider";
import { colors } from "../src/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MobileQueryProvider>
        <AuthProvider>
          <AuthenticatedStack />
        </AuthProvider>
      </MobileQueryProvider>
    </SafeAreaProvider>
  );
}

function AuthenticatedStack() {
  const { isHydrating } = useAuth();

  if (isHydrating) {
    return (
      <View style={styles.loadingPage}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right"
      }}
    />
  );
}

const styles = StyleSheet.create({
  loadingPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.screenBackground
  }
});
