import { ProtectedRoute } from "../src/components/auth/ProtectedRoute";
import { AdminDashboard } from "../src/screens/admin/AdminDashboard";

export default function AdminScreen() {
  return (
    <ProtectedRoute allowedRole="admin">
      <AdminDashboard />
    </ProtectedRoute>
  );
}
