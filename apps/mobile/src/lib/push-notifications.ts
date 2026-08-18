import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const NOTIFICATION_CHANNEL_ID = "visitor-updates";
let activePushToken: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

function getProjectId() {
  return Constants.easConfig?.projectId
    ?? Constants.expoConfig?.extra?.eas?.projectId;
}

export async function registerPushNotifications() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: "Visitor updates",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 200, 250],
      lightColor: "#B51217"
    });
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  const permission = existingPermission.status === "granted"
    ? existingPermission
    : await Notifications.requestPermissionsAsync();

  if (permission.status !== "granted") {
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    throw new Error("EAS project ID is missing from the Expo configuration.");
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await supabase.rpc("register_push_token", {
    p_platform: Platform.OS,
    p_token: token
  });

  if (error) {
    throw new Error(error.message);
  }

  activePushToken = token;
  return token;
}

export async function unregisterPushNotifications() {
  if (!activePushToken) {
    return;
  }

  const { error } = await supabase.rpc("unregister_push_token", {
    p_token: activePushToken
  });

  if (error) {
    throw new Error(error.message);
  }

  activePushToken = null;
}

