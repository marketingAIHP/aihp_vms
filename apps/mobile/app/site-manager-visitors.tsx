import { ProtectedRoute } from "../src/components/auth/ProtectedRoute";
import { SiteManagerVisitorsScreen } from "../src/screens/site-manager/SiteManagerVisitorsScreen";

export default function SiteManagerVisitorsRoute() {
  return (
    <ProtectedRoute allowedRole="site_manager">
      <SiteManagerVisitorsScreen />
    </ProtectedRoute>
  );
}
