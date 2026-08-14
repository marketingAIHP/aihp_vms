import { ProtectedRoute } from "../src/components/auth/ProtectedRoute";
import { SiteManagerNotificationsScreen } from "../src/screens/site-manager/SiteManagerNotificationsScreen";

export default function SiteManagerNotificationsRoute() {
  return (
    <ProtectedRoute allowedRole="site_manager">
      <SiteManagerNotificationsScreen />
    </ProtectedRoute>
  );
}
