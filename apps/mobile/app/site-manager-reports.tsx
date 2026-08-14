import { ProtectedRoute } from "../src/components/auth/ProtectedRoute";
import { SiteManagerReportsScreen } from "../src/screens/site-manager/SiteManagerReportsScreen";

export default function SiteManagerReportsRoute() {
  return (
    <ProtectedRoute allowedRole="site_manager">
      <SiteManagerReportsScreen />
    </ProtectedRoute>
  );
}
