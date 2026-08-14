import { ProtectedRoute } from "../src/components/auth/ProtectedRoute";
import { SiteManagerDashboard } from "../src/screens/site-manager/SiteManagerDashboard";

export default function SiteManagerRoute() {
  return (
    <ProtectedRoute allowedRole="site_manager">
      <SiteManagerDashboard />
    </ProtectedRoute>
  );
}
