import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

export default function IndexScreen() {
  const { session } = useAuth();

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (session.role === "site_manager") {
    return <Redirect href="/site-manager" />;
  }

  return <Redirect href="/admin" />;
}
