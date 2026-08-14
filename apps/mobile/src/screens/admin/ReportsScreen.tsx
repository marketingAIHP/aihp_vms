import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { useVmsData } from "../../hooks/use-vms-data";
import type { UserRecord, VisitRecord } from "../../types/vms";
import { colors, radius, spacing } from "../../theme";
import { AppButton, Badge, Panel } from "../../ui/components";

type ExportFormat = "CSV" | "Excel" | "PDF";
type TimePeriod = "monthly" | "quarterly" | "yearly" | "custom" | "";
type PickerState = { field: "from" | "to"; value: Date } | null;

type SelectOption = {
  label: string;
  value: string;
};

const monthOptions: SelectOption[] = [
  { label: "January", value: "0" },
  { label: "February", value: "1" },
  { label: "March", value: "2" },
  { label: "April", value: "3" },
  { label: "May", value: "4" },
  { label: "June", value: "5" },
  { label: "July", value: "6" },
  { label: "August", value: "7" },
  { label: "September", value: "8" },
  { label: "October", value: "9" },
  { label: "November", value: "10" },
  { label: "December", value: "11" }
];

const quarterOptions: SelectOption[] = [
  { label: "Q1", value: "1" },
  { label: "Q2", value: "2" },
  { label: "Q3", value: "3" },
  { label: "Q4", value: "4" }
];

const timePeriodOptions: SelectOption[] = [
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Yearly", value: "yearly" },
  { label: "Custom", value: "custom" }
];

function buildCsv(rows: Record<string, string | number>[]) {
  if (rows.length === 0) {
    return "No records";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(","))
  ];
  return lines.join("\n");
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function getStatusTone(status: VisitRecord["status"]) {
  if (status === "CHECKED_IN") {
    return "success" as const;
  }
  if (status === "CHECKED_OUT") {
    return "neutral" as const;
  }
  return "info" as const;
}

function buildYearOptions() {
  const currentYear = new Date().getFullYear();
  const options: SelectOption[] = [];
  for (let year = currentYear; year >= 2025; year -= 1) {
    options.push({ label: String(year), value: String(year) });
  }
  return options;
}

function isSiteManager(user: UserRecord) {
  return user.role === "site_manager" && user.status === "active";
}

export function ReportsScreen() {
  return (
    <ProtectedRoute allowedRole="admin">
      <ReportsContent />
    </ProtectedRoute>
  );
}

function ReportsContent() {
  const { loading, masterData, users, visits } = useVmsData();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("");
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedQuarter, setSelectedQuarter] = useState("1");
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedSiteManager, setSelectedSiteManager] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("CSV");
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [pickerState, setPickerState] = useState<PickerState>(null);
  const [openSelect, setOpenSelect] = useState<{
    options: SelectOption[];
    title: string;
    value: string;
    onSelect: (value: string) => void;
  } | null>(null);

  const yearOptions = useMemo(() => buildYearOptions(), []);

  const activeBuildings = useMemo(
    () => masterData.buildings.filter(Boolean).map((building) => ({ label: building, value: building })),
    [masterData.buildings]
  );

  const siteManagerOptions = useMemo(() => {
    return users
      .filter((user) => isSiteManager(user) && (!selectedBuilding || user.siteName === selectedBuilding))
      .map((user) => ({ label: user.name, value: user.id }));
  }, [selectedBuilding, users]);

  const customDateError = useMemo(() => {
    if (timePeriod !== "custom") {
      return "";
    }
    if (fromDate.getTime() > toDate.getTime()) {
      return "From Date cannot be later than To Date.";
    }
    return "";
  }, [fromDate, timePeriod, toDate]);

  const filteredRecords = useMemo(() => {
    return visits.filter((visit) => {
      const scheduled = new Date(visit.createdAt);
      const buildingMatch = !selectedBuilding || visit.building === selectedBuilding;
      const siteManagerMatch = !selectedSiteManager || visit.siteManagerId === selectedSiteManager;

      if (!buildingMatch || !siteManagerMatch) {
        return false;
      }

      if (timePeriod === "monthly") {
        return (
          scheduled.getFullYear() === Number(selectedYear) &&
          scheduled.getMonth() === Number(selectedMonth)
        );
      }

      if (timePeriod === "quarterly") {
        const quarter = Math.floor(scheduled.getMonth() / 3) + 1;
        return scheduled.getFullYear() === Number(selectedYear) && quarter === Number(selectedQuarter);
      }

      if (timePeriod === "yearly") {
        return scheduled.getFullYear() === Number(selectedYear);
      }

      if (timePeriod === "custom") {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        return scheduled >= from && scheduled <= to;
      }

      return false;
    });
  }, [
    fromDate,
    selectedBuilding,
    selectedSiteManager,
    selectedMonth,
    selectedQuarter,
    selectedYear,
    timePeriod,
    toDate,
    visits
  ]);

  const hasValidFilters = Boolean(timePeriod) && !customDateError;
  const canDownload = hasValidFilters && filteredRecords.length > 0;

  function openOptions(title: string, value: string, options: SelectOption[], onSelect: (nextValue: string) => void) {
    setOpenSelect({ title, value, options, onSelect });
  }

  function handleTimePeriodChange(value: string) {
    setTimePeriod(value as TimePeriod);
  }

  function handleBuildingChange(value: string) {
    setSelectedBuilding(value);
    setSelectedSiteManager("");
  }

  function handleDateChange(_: DateTimePickerEvent, date?: Date) {
    if (!pickerState) {
      return;
    }

    setPickerState(null);
    if (!date) {
      return;
    }

    if (pickerState.field === "from") {
      setFromDate(date);
      return;
    }

    setToDate(date);
  }

  async function handleDownload() {
    if (!timePeriod) {
      Alert.alert("Select Time Period", "Choose a time period before downloading the report.");
      return;
    }

    if (customDateError) {
      Alert.alert("Invalid Date Range", customDateError);
      return;
    }

    if (filteredRecords.length === 0) {
      Alert.alert("No Records", "No visits match the selected filters.");
      return;
    }

    const rows = filteredRecords.map((visit) => ({
      Visitor: visit.visitorName,
      SiteManager: visit.siteManagerName,
      Building: visit.building,
      Purpose: visit.purpose,
      Status: visit.status,
      CheckedInAt: formatDateTime(visit.checkedInAt ?? visit.createdAt)
    }));

    const content = buildCsv(rows);
    const title = `Visitor Management ${selectedFormat} Report`;

    try {
      await Share.share({
        title,
        message: selectedFormat === "PDF" ? `${title}\n\n${content}` : content
      });
    } catch (error) {
      Alert.alert("Download failed", error instanceof Error ? error.message : "Unable to export report.");
    }
  }

  function renderSelectField(
    label: string,
    valueLabel: string,
    options: SelectOption[],
    selectedValue: string,
    onSelect: (value: string) => void,
    placeholder: string,
    disabled?: boolean
  ) {
    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{label}</Text>
        <Pressable
          disabled={disabled}
          onPress={() => openOptions(label, selectedValue, options, onSelect)}
          style={[styles.selectField, disabled && styles.disabledField]}
        >
          <Text style={[styles.selectText, !valueLabel && styles.placeholderText]}>
            {valueLabel || placeholder}
          </Text>
          <Text style={styles.chevron}>⌄</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.header}>
              <Pressable onPress={() => router.back()}>
                <Text style={styles.back}>‹ Back</Text>
              </Pressable>
              <Text style={styles.title}>Reports</Text>
              <View style={styles.placeholder} />
            </View>

            <Panel style={styles.filterPanel}>
              {renderSelectField(
                "Time Period",
                timePeriodOptions.find((option) => option.value === timePeriod)?.label ?? "",
                timePeriodOptions,
                timePeriod,
                handleTimePeriodChange,
                "Select time period"
              )}

              {timePeriod === "monthly"
                ? (
                  <>
                    {renderSelectField(
                      "Month",
                      monthOptions.find((option) => option.value === selectedMonth)?.label ?? "",
                      monthOptions,
                      selectedMonth,
                      setSelectedMonth,
                      "Select month"
                    )}
                    {renderSelectField(
                      "Year",
                      yearOptions.find((option) => option.value === selectedYear)?.label ?? "",
                      yearOptions,
                      selectedYear,
                      setSelectedYear,
                      "Select year"
                    )}
                  </>
                )
                : null}

              {timePeriod === "quarterly"
                ? (
                  <>
                    {renderSelectField(
                      "Quarter",
                      quarterOptions.find((option) => option.value === selectedQuarter)?.label ?? "",
                      quarterOptions,
                      selectedQuarter,
                      setSelectedQuarter,
                      "Select quarter"
                    )}
                    {renderSelectField(
                      "Year",
                      yearOptions.find((option) => option.value === selectedYear)?.label ?? "",
                      yearOptions,
                      selectedYear,
                      setSelectedYear,
                      "Select year"
                    )}
                  </>
                )
                : null}

              {timePeriod === "yearly"
                ? renderSelectField(
                    "Year",
                    yearOptions.find((option) => option.value === selectedYear)?.label ?? "",
                    yearOptions,
                    selectedYear,
                    setSelectedYear,
                    "Select year"
                  )
                : null}

              {timePeriod === "custom"
                ? (
                  <View style={styles.dateRow}>
                    <View style={styles.dateField}>
                      <Text style={styles.label}>From Date</Text>
                      <Pressable onPress={() => setPickerState({ field: "from", value: fromDate })} style={styles.selectField}>
                        <Text style={styles.selectText}>{formatDate(fromDate)}</Text>
                      </Pressable>
                    </View>
                    <View style={styles.dateField}>
                      <Text style={styles.label}>To Date</Text>
                      <Pressable onPress={() => setPickerState({ field: "to", value: toDate })} style={styles.selectField}>
                        <Text style={styles.selectText}>{formatDate(toDate)}</Text>
                      </Pressable>
                    </View>
                  </View>
                )
                : null}

              {customDateError ? <Text style={styles.errorText}>{customDateError}</Text> : null}

              {renderSelectField(
                "Building",
                activeBuildings.find((option) => option.value === selectedBuilding)?.label ?? "",
                [{ label: "All Buildings", value: "" }, ...activeBuildings],
                selectedBuilding,
                handleBuildingChange,
                loading ? "Loading buildings..." : "All Buildings",
                loading
              )}

              {renderSelectField(
                "Site Manager",
                siteManagerOptions.find((option) => option.value === selectedSiteManager)?.label ?? "",
                [{ label: "All Site Managers", value: "" }, ...siteManagerOptions],
                selectedSiteManager,
                setSelectedSiteManager,
                loading ? "Loading site managers..." : "All Site Managers",
                loading
              )}

              <AppButton
                disabled={!canDownload}
                onPress={() => void handleDownload()}
                title="Download Report"
              />

              <View style={styles.formatRow}>
                {(["CSV", "Excel", "PDF"] as const).map((format) => (
                  <Pressable
                    key={format}
                    onPress={() => setSelectedFormat(format)}
                    style={[styles.formatButton, selectedFormat === format && styles.formatButtonSelected]}
                  >
                    <Text style={[styles.formatText, selectedFormat === format && styles.formatTextSelected]}>
                      {format}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Panel>

            <Text style={styles.sectionTitle}>Filtered records</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Panel style={styles.recordCard}>
            <View style={styles.recordHeader}>
              <View style={styles.recordCopy}>
                <Text style={styles.recordName}>{item.visitorName}</Text>
                <Text style={styles.recordMeta}>{item.siteManagerName} • {item.building}</Text>
              </View>
              <Badge label={item.status.replaceAll("_", " ")} tone={getStatusTone(item.status)} />
            </View>
            <Text style={styles.recordMeta}>{item.purpose}</Text>
            <Text style={styles.recordMeta}>{formatDateTime(item.checkedInAt ?? item.createdAt)}</Text>
          </Panel>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {hasValidFilters ? "No records match the selected filters." : "Select a time period to view records."}
          </Text>
        }
      />

      {openSelect ? (
        <Modal animationType="fade" transparent visible onRequestClose={() => setOpenSelect(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setOpenSelect(null)}>
            <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
              <Text style={styles.modalTitle}>{openSelect.title}</Text>
              <FlatList
                data={openSelect.options}
                keyExtractor={(item) => `${openSelect.title}-${item.label}-${item.value}`}
                renderItem={({ item }) => {
                  const selected = openSelect.value === item.value;
                  return (
                    <Pressable
                      onPress={() => {
                        openSelect.onSelect(item.value);
                        setOpenSelect(null);
                      }}
                      style={[styles.optionRow, selected && styles.optionRowSelected]}
                    >
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{item.label}</Text>
                    </Pressable>
                  );
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {pickerState ? (
        <DateTimePicker
          mode="date"
          onChange={handleDateChange}
          value={pickerState.value}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBackground
  },
  content: {
    padding: spacing.md,
    gap: spacing.md
  },
  headerWrap: {
    gap: spacing.md
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  back: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800"
  },
  placeholder: {
    width: 44
  },
  filterPanel: {
    gap: spacing.md
  },
  fieldGroup: {
    gap: spacing.xs
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  selectField: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.almostWhite,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  disabledField: {
    opacity: 0.6
  },
  selectText: {
    flex: 1,
    color: colors.navyInk,
    fontSize: 15
  },
  placeholderText: {
    color: colors.coolGrey
  },
  chevron: {
    color: colors.coolGrey,
    fontSize: 16,
    fontWeight: "700"
  },
  dateRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  dateField: {
    flex: 1,
    gap: spacing.xs
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 16
  },
  formatRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  formatButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: "center",
    justifyContent: "center"
  },
  formatButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  formatText: {
    color: colors.secondaryText,
    fontSize: 14,
    fontWeight: "700"
  },
  formatTextSelected: {
    color: colors.primary
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800"
  },
  recordCard: {
    marginBottom: spacing.sm
  },
  recordHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  recordCopy: {
    flex: 1,
    gap: 4
  },
  recordName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  recordMeta: {
    color: colors.secondaryText,
    fontSize: 13,
    lineHeight: 18
  },
  emptyText: {
    color: colors.secondaryText,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: spacing.lg
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.4)",
    justifyContent: "center",
    padding: spacing.lg
  },
  modalCard: {
    maxHeight: "70%",
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800"
  },
  optionRow: {
    minHeight: 44,
    borderRadius: radius.md,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs
  },
  optionRowSelected: {
    backgroundColor: colors.primarySoft
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600"
  },
  optionTextSelected: {
    color: colors.primary
  }
});
