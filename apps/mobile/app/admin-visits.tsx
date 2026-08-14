import { AdminVisitRecordsScreen, allVisitsFilter } from "../src/screens/admin/AdminVisitRecordsScreen";

export default function AdminVisitsRoute() {
  return (
    <AdminVisitRecordsScreen
      title="All Visits"
      filter={allVisitsFilter}
      emptyText="No visits are available yet."
    />
  );
}
