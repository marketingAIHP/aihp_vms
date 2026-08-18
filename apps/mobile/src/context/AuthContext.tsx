import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { createContext, useContext, useEffect, useMemo } from "react";
import type { PropsWithChildren } from "react";
import { apiClient } from "../lib/api-client";
import { registerPushNotifications, unregisterPushNotifications } from "../lib/push-notifications";
import { type SessionRole, useSessionStore } from "../store/session-store";

type AuthContextValue = {
  isHydrating: boolean;
  session: ReturnType<typeof useSessionStore.getState>["session"];
  login: (email: string, password: string, expectedRole: SessionRole) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const isHydrating = useSessionStore((state) => state.isHydrating);
  const session = useSessionStore((state) => state.session);
  const setHydrating = useSessionStore((state) => state.setHydrating);
  const setSession = useSessionStore((state) => state.setSession);
  const clearSession = useSessionStore((state) => state.clearSession);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const restored = await apiClient.restoreSession();
        if (!mounted) {
          return;
        }

        if (restored) {
          setSession(restored);
        } else {
          clearSession();
        }
      } catch {
        if (mounted) {
          clearSession();
        }
      } finally {
        if (mounted) {
          setHydrating(false);
        }
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [clearSession, setHydrating, setSession]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void registerPushNotifications().catch(() => {
      // Notification setup must not block an otherwise valid authenticated session.
    });

    const openNotifications = () => {
      router.push(session.role === "admin" ? "/admin-notifications" : "/site-manager-notifications");
    };

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(openNotifications);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        openNotifications();
        void Notifications.clearLastNotificationResponseAsync();
      }
    });

    return () => {
      responseSubscription.remove();
    };
  }, [session?.role, session?.userId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isHydrating,
      session,
      async login(email, password, expectedRole) {
        const nextSession = await apiClient.login(email, password);
        if (nextSession.role !== expectedRole) {
          await apiClient.logout();
          throw new Error(`This account is assigned to ${nextSession.role}. Please choose the correct role and try again.`);
        }
        setSession(nextSession);
      },
      async logout() {
        try {
          await unregisterPushNotifications();
        } catch {
          // Supabase sign-out must still complete if token deactivation is temporarily unavailable.
        } finally {
          await apiClient.logout();
          clearSession();
        }
      },
      async requestPasswordReset(email) {
        await apiClient.requestPasswordReset(email);
      }
    }),
    [clearSession, isHydrating, session, setSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
