import { ProtectedRoute } from "../src/components/auth/ProtectedRoute";
import { SiteManagerSettingsScreen } from "../src/screens/site-manager/SiteManagerSettingsScreen";

export default function SiteManagerSettingsRoute() {
  return (
    <ProtectedRoute allowedRole="site_manager">
      <SiteManagerSettingsScreen />
    </ProtectedRoute>
  );
}
