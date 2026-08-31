"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { ChevronLeft, LogIn, LogOut, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PublicHero } from "@/components/visitor/public-hero";
import { visitorSites } from "@/lib/visitor-sites";
import type { SiteRecord } from "@/lib/types";

function buildSiteToken(value: string) {
  return encodeURIComponent(value.trim());
}

const QR_DISPLAY_DURATION_MS = 60_000;
const RECEPTION_VIDEO_URL = "/videos/aihp-managed-workspaces.mp4";
const DEVICE_SITE_STORAGE_KEY = "aihp-reception-device-site";

function getWebBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_WEB_BASE_URL;
  if (configured?.trim()) {
    return configured.replace(/\/$/, "");
  }

  return typeof window !== "undefined" ? window.location.origin : "";
}

function ReceptionQrCard({
  subtitle,
  title,
  url,
}: {
  subtitle: string;
  title: string;
  url: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let active = true;

    void QRCode.toDataURL(url, {
      margin: 1,
      width: 220,
    }).then((dataUrl: string) => {
      if (active) {
        setQrDataUrl(dataUrl);
      }
    });

    return () => {
      active = false;
    };
  }, [url]);

  return (
    <Card className="rounded-[28px] border-border/70 shadow-lg">
      <CardContent className="grid gap-5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <QrCode className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-[24px] border border-border/70 bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qrDataUrl ? <img src={qrDataUrl} alt={`${title} QR code`} className="mx-auto aspect-square w-full max-w-[220px]" /> : null}
        </div>
        <p className="break-all text-xs text-muted-foreground">{url}</p>
      </CardContent>
    </Card>
  );
}

export default function ReceptionPage() {
  const [sites, setSites] = useState<SiteRecord[]>(
    visitorSites.map((name) => ({ address: "", id: name, isActive: true, name }))
  );
  const [selectedSite, setSelectedSite] = useState<string>(visitorSites[0]);
  const [activeQr, setActiveQr] = useState<"checkin" | "checkout" | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [deviceSite, setDeviceSite] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [activationError, setActivationError] = useState("");

  useEffect(() => {
    setBaseUrl(getWebBaseUrl());
    const savedSite = window.localStorage.getItem(DEVICE_SITE_STORAGE_KEY);
    if (savedSite) {
      setDeviceSite(savedSite);
      setSelectedSite(savedSite);
    }
  }, []);

  async function activateDevice() {
    setActivationError("");
    try {
      const response = await fetch("/api/public/device-activation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activationCode }) });
      const payload = await response.json() as { message?: string; siteName?: string };
      if (!response.ok || !payload.siteName) throw new Error(payload.message ?? "Unable to activate device.");
      window.localStorage.setItem(DEVICE_SITE_STORAGE_KEY, payload.siteName);
      setDeviceSite(payload.siteName);
      setSelectedSite(payload.siteName);
      setActivationCode("");
    } catch (error) {
      setActivationError(error instanceof Error ? error.message : "Unable to activate device.");
    }
  }

  useEffect(() => {
    if (!activeQr) return;

    const timer = window.setTimeout(() => {
      setActiveQr(null);
    }, QR_DISPLAY_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [activeQr]);

  useEffect(() => {
    let active = true;
    void fetch("/api/public/sites")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload: { sites?: SiteRecord[] }) => {
        if (active && payload.sites?.length) {
          setSites(payload.sites);
          setSelectedSite((current) => payload.sites?.some((site) => site.name === current) ? current : payload.sites![0].name);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const siteToken = useMemo(() => buildSiteToken(selectedSite || "main"), [selectedSite]);
  const checkInUrl = baseUrl ? `${baseUrl}/checkin/${siteToken}` : "";
  const checkOutUrl = baseUrl ? `${baseUrl}/checkout/${siteToken}` : "";

  return (
    <main className="min-h-screen bg-[#051622] px-3 py-5 sm:px-5 sm:py-8 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex items-center justify-between">
          {activeQr ? (
            <Button type="button" variant="ghost" className="px-0 text-primary hover:bg-transparent hover:text-primary" onClick={() => setActiveQr(null)}>
              <ChevronLeft className="mr-1 size-4" />
              Back
            </Button>
          ) : (
            <Button asChild type="button" variant="ghost" className="px-0 text-primary hover:bg-transparent hover:text-primary">
              <Link href="/">
                <ChevronLeft className="mr-1 size-4" />
                Back
              </Link>
            </Button>
          )}
          <div className="w-12" />
        </div>

        <PublicHero
          title={selectedSite || "Select a site"}
          subtitle="Secure Visitor Access & Building Operations"
        />

        {activeQr ? (
          <ReceptionQrCard
            title={activeQr === "checkin" ? "Visitor Check-In" : "Visitor Check-Out"}
            subtitle={
              activeQr === "checkin"
                ? "Scan this QR code to open the visitor check-in form."
                : "Scan this QR code to open the visitor check-out form."
            }
            url={activeQr === "checkin" ? checkInUrl : checkOutUrl}
          />
        ) : (
          <Card className="rounded-[28px] border-border/70 shadow-lg">
            <CardContent className="grid gap-5 p-5 sm:p-6">
              {!deviceSite ? <div className="grid gap-3">
                <p className="text-sm font-semibold text-foreground">Activate this device</p>
                <Input value={activationCode} onChange={(event) => setActivationCode(event.target.value.toUpperCase())} placeholder="Device activation code" maxLength={32} />
                <Button type="button" disabled={!activationCode.trim()} onClick={() => void activateDevice()}>Activate Device</Button>
                {activationError ? <p className="text-sm text-destructive">{activationError}</p> : null}
              </div> : <div className="rounded-2xl bg-primary/10 p-4"><p className="text-xs font-semibold text-muted-foreground">THIS DEVICE IS ASSIGNED TO</p><p className="mt-1 text-lg font-bold text-foreground">{deviceSite}</p></div>}
              {!deviceSite ? <div className="grid gap-2">
                <p className="text-sm font-semibold text-foreground">Site Selector</p>
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger className="h-13 w-full rounded-2xl px-4 text-sm sm:text-base">
                    <SelectValue placeholder="Select Site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.name}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div> : null}

              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black shadow-lg">
                <div className="aspect-video w-full overflow-hidden bg-black lg:aspect-[16/8]">
                  <video
                    src={RECEPTION_VIDEO_URL}
                    className="h-full w-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    aria-label="AIHP managed workspaces introduction"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <Button
                  type="button"
                  disabled={!selectedSite || !baseUrl}
                  className="h-14 rounded-2xl px-3 text-sm font-bold shadow-lg sm:h-16 sm:text-base"
                  onClick={() => setActiveQr("checkin")}
                >
                  <LogIn className="mr-1 size-5" />
                  Visitor Check-In
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!selectedSite || !baseUrl}
                  className="h-14 rounded-2xl border border-white/10 px-3 text-sm font-bold shadow-lg sm:h-16 sm:text-base"
                  onClick={() => setActiveQr("checkout")}
                >
                  <LogOut className="mr-1 size-5" />
                  Visitor Check-Out
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">{deviceSite ? "This device remains assigned until an admin activates it with a different device code." : "Activate this device to lock it to its assigned site."}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
