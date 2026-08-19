import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { QrCode } from "lucide-react-native";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import QRCode from "qrcode";
import { SvgXml } from "react-native-svg";
import { AIHPLogo } from "../../components/branding/AIHPLogo";
import { useAuth } from "../../context/AuthContext";
import { useVmsData } from "../../hooks/use-vms-data";
import { colors, radius, spacing } from "../../theme";
import { AppButton } from "../../ui/components";

const fallbackSites = [
  "AIHP Tower",
  "AIHP Cyber Greens 2",
  "AIHP Cyber Greens",
  "AIHP Horizon",
  "AIHP Signature",
  "AIHP Palms",
  "AIHP Millennium",
  "AIHP Milestone",
  "BPTP Centra 1",
  "Eros City Square",
  "Silverton Tower",
  "SPAZE BUSINESS PARK",
  "Splendor Spectrum",
  "Unitech Business Zone",
  "M3M URBANA",
  "Pioneer Urban Square",
  "Palm Spring Plaza",
  "Ocus Technopolis",
  "Veritas",
  "MGF Metropolis",
  "AIHP SCO-27",
  "AIHP Executive Center",
  "AIHP Broadway",
  "AIHP Skyline",
  "Good Earth City Center Mall",
  "Spaze ITech Park",
  "AIHP Atrium",
  "AIHP Spectra",
  "AIHP ONE",
  "RP Farms",
  "GULBAGH MANDI FARMS",
  "PT NO: 390"
] as const;

const QR_DISPLAY_DURATION_MS = 60_000;

type ReceptionSite = {
  address?: string;
  id: string;
  imageUrl?: string;
  name: string;
};

function buildSiteToken(value: string) {
  return encodeURIComponent(value.trim());
}

function getWebBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_WEB_BASE_URL;
  if (configured?.trim()) {
    return configured.replace(/\/$/, "");
  }
  return "";
}

function ReceptionQrCard({
  subtitle,
  title,
  url
}: {
  subtitle: string;
  title: string;
  url: string;
}) {
  const [svgMarkup, setSvgMarkup] = useState("");

  useEffect(() => {
    let active = true;

    void QRCode.toString(url, {
      margin: 1,
      type: "svg",
      width: 220
    }).then((markup: string) => {
      if (active) {
        setSvgMarkup(markup);
      }
    });

    return () => {
      active = false;
    };
  }, [url]);

  return (
    <View style={styles.qrCard}>
      <View style={styles.qrHeader}>
        <View style={styles.qrIconShell}>
          <QrCode size={22} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={styles.qrCopy}>
          <Text style={styles.qrTitle}>{title}</Text>
          <Text style={styles.qrSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.qrCanvas}>
        {svgMarkup ? <SvgXml xml={svgMarkup} width="100%" height="100%" /> : null}
      </View>
      <Text style={styles.qrUrl}>{url}</Text>
    </View>
  );
}

export function ReceptionModeScreen() {
  return <ReceptionModeContent />;
}

function ReceptionModeContent() {
  const { session } = useAuth();
  const { masterData } = useVmsData();
  const [activeQr, setActiveQr] = useState<"checkin" | "checkout" | null>(null);
  const [selectedSite, setSelectedSite] = useState("");
  const [siteRecords, setSiteRecords] = useState<ReceptionSite[]>([]);
  const [sitePickerVisible, setSitePickerVisible] = useState(false);
  const baseUrl = useMemo(() => getWebBaseUrl(), []);
  const availableSites = useMemo(
    () => (siteRecords.length
      ? siteRecords.map((site) => site.name)
      : masterData.buildings.length
        ? masterData.buildings
        : [...fallbackSites]),
    [masterData.buildings, siteRecords]
  );

  useEffect(() => {
    if (!baseUrl) return;

    let active = true;
    void fetch(`${baseUrl}/api/public/sites`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload: { sites?: ReceptionSite[] }) => {
        if (active && payload.sites?.length) setSiteRecords(payload.sites);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [baseUrl]);

  useEffect(() => {
    if (!selectedSite) {
      const defaultSite = session?.siteName || availableSites[0] || "";
      if (defaultSite) {
        setSelectedSite(defaultSite);
      }
    }
  }, [availableSites, selectedSite, session?.siteName]);

  useEffect(() => {
    if (!activeQr) return;

    const timer = setTimeout(() => {
      setActiveQr(null);
    }, QR_DISPLAY_DURATION_MS);

    return () => clearTimeout(timer);
  }, [activeQr]);

  const siteToken = useMemo(() => buildSiteToken(selectedSite || "main"), [selectedSite]);
  const checkInUrl = baseUrl ? `${baseUrl}/checkin/${siteToken}` : "";
  const checkOutUrl = baseUrl ? `${baseUrl}/checkout/${siteToken}` : "";
  const hasSites = availableSites.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => (activeQr ? setActiveQr(null) : router.back())}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <View style={styles.placeholder} />
        </View>

        {baseUrl ? (
          activeQr ? (
            <>
              <View style={styles.brandHero}>
                <View style={styles.logoShell}><AIHPLogo size="sm" onDark /></View>
                <Text style={styles.heroTitle}>{selectedSite}</Text>
                <Text style={styles.heroSubtitle}>Secure Visitor Access &amp; Building Operations</Text>
              </View>

              <ReceptionQrCard
                title={activeQr === "checkin" ? "Visitor Check-In" : "Visitor Check-Out"}
                subtitle={
                  activeQr === "checkin"
                    ? "Scan this QR code to open the visitor check-in form."
                    : "Scan this QR code to open the visitor check-out form."
                }
                url={activeQr === "checkin" ? checkInUrl : checkOutUrl}
              />
            </>
          ) : (
            <>
              <View style={styles.brandHero}>
                <View style={styles.logoShell}><AIHPLogo size="sm" onDark /></View>
                <Text style={styles.heroTitle}>{selectedSite || "Select a site"}</Text>
                <Text style={styles.heroSubtitle}>Secure Visitor Access &amp; Building Operations</Text>
              </View>

              <View style={styles.selectionCard}>
                <Text style={styles.sectionLabel}>Site Selector</Text>
                <Pressable style={styles.selectField} onPress={() => setSitePickerVisible(true)} disabled={!hasSites}>
                  <Text style={selectedSite ? styles.selectValue : styles.selectPlaceholder}>
                    {selectedSite || "Select Site"}
                  </Text>
                  <Text style={styles.selectChevron}>⌄</Text>
                </Pressable>

                {selectedSite ? (
                  <>
                    <View style={styles.siteImageCard}>
                      <View style={styles.siteImageCanvas}>
                        <WebView
                          source={{
                            html: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;background:#000;overflow:hidden}video{width:100%;height:100%;object-fit:cover}</style></head><body><video src="${baseUrl}/videos/aihp-managed-workspaces.mp4" autoplay loop muted playsinline webkit-playsinline></video></body></html>`
                          }}
                          style={styles.siteVideo}
                          allowsInlineMediaPlayback
                          javaScriptEnabled
                          mediaPlaybackRequiresUserAction={false}
                          scrollEnabled={false}
                          setSupportMultipleWindows={false}
                        />
                      </View>
                    </View>
                    <View style={styles.actionRow}>
                      <AppButton title="Visitor Check-In" style={styles.actionButton} onPress={() => setActiveQr("checkin")} />
                      <AppButton title="Visitor Check-Out" style={styles.actionButton} variant="secondary" onPress={() => setActiveQr("checkout")} />
                    </View>
                    <Text style={styles.helperText}>Select a site, then open the required QR. Only one QR is shown at a time.</Text>
                  </>
                ) : (
                  <Text style={styles.helperText}>Select a site to continue.</Text>
                )}
              </View>
            </>
          )
        ) : (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>QR URL not configured</Text>
            <Text style={styles.warningText}>
              Set `EXPO_PUBLIC_WEB_BASE_URL` in `apps/mobile/.env` to your web app URL and restart Expo.
            </Text>
            <Text style={styles.warningCode}>https://your-domain.vercel.app</Text>
          </View>
        )}
      </ScrollView>

      <Modal animationType="slide" transparent visible={sitePickerVisible} onRequestClose={() => setSitePickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Site</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableSites.map((site) => (
                <Pressable
                  key={site}
                  style={[styles.optionRow, site === selectedSite && styles.optionRowActive]}
                  onPress={() => {
                    setSelectedSite(site);
                    setSitePickerVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, site === selectedSite && styles.optionTextActive]}>{site}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <AppButton title="Close" variant="ghost" onPress={() => setSitePickerVisible(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.navyInk
  },
  content: {
    padding: spacing.md,
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
  placeholder: {
    width: 44
  },
  brandHero: {
    alignItems: "center",
    backgroundColor: colors.navyInk,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(18,138,160,0.24)",
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: colors.navyInk,
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  logoShell: {
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  heroTitle: {
    color: colors.pureWhite,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center"
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    textAlign: "center"
  },
  selectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: colors.navyInk,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  sectionLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800"
  },
  selectField: {
    minHeight: 54,
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
  selectValue: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600"
  },
  selectPlaceholder: {
    flex: 1,
    color: colors.secondaryText,
    fontSize: 14
  },
  selectChevron: {
    color: colors.secondaryText,
    fontSize: 16,
    fontWeight: "700"
  },
  siteImageCard: {
    backgroundColor: colors.pureWhite,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden"
  },
  siteImageCanvas: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.navyInk,
    overflow: "hidden"
  },
  siteVideo: {
    backgroundColor: colors.navyInk,
    height: "100%",
    width: "100%"
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  actionButton: {
    flex: 1,
    minHeight: 60,
    paddingHorizontal: spacing.sm
  },
  helperText: {
    color: colors.secondaryText,
    fontSize: 13
  },
  qrCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: colors.navyInk,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  qrHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  qrIconShell: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  qrCopy: {
    flex: 1,
    gap: 2
  },
  qrTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800"
  },
  qrSubtitle: {
    color: colors.secondaryText,
    fontSize: 13,
    lineHeight: 18
  },
  qrCanvas: {
    width: 240,
    height: 240,
    alignSelf: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.pureWhite,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center"
  },
  qrUrl: {
    color: colors.secondaryText,
    fontSize: 12,
    lineHeight: 18
  },
  warningCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm
  },
  warningTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800"
  },
  warningText: {
    color: colors.secondaryText,
    fontSize: 14,
    lineHeight: 20
  },
  warningCode: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800"
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.35)",
    justifyContent: "flex-end"
  },
  modalCard: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
    gap: spacing.md,
    maxHeight: "70%"
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800"
  },
  optionRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  optionRowActive: {
    backgroundColor: colors.primarySoft
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600"
  },
  optionTextActive: {
    color: colors.primary
  }
});
