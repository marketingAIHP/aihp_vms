"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Camera, CheckCircle2, ExternalLink, RefreshCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PublicHero } from "@/components/visitor/public-hero";

const purposeOptions = [
  "Meeting",
  "Interview",
  "Delivery",
  "Vendor",
  "Maintenance",
  "Personal",
  "Other",
] as const;

const commuteOptions = ["Personal Vehicle", "Public Transport"] as const;
type AgreementSection = {
  heading: string;
  body: readonly string[];
  bullets?: readonly string[];
};

const agreementSections: readonly AgreementSection[] = [
  {
    heading: "Visitor Non-Disclosure Agreement (NDA)",
    body: [
      "I, the undersigned Visitor, acknowledge and agree that during my visit to the premises of the building and/or any client office located within the premises, I may gain access to confidential, proprietary, privileged, or commercially sensitive information.",
      "Such information may include, but is not limited to:",
    ],
    bullets: [
      "Business operations, procedures, and processes",
      "Client, customer, and vendor information",
      "Financial, strategic, and commercial information",
      "Technical data, software, systems, and infrastructure",
      "Intellectual property and trade secrets",
      "Employee and personnel information",
      "Security systems, protocols, and access arrangements",
      "Documents, presentations, reports, records, and communications",
      "Any information identified as confidential by the Building Management or tenant organizations",
    ],
  },
  {
    heading: "1. Obligations of the Visitor",
    body: ["I hereby undertake and agree that I shall:"],
    bullets: [
      "Maintain strict confidentiality regarding all information observed, accessed, or received during my visit.",
      "Not disclose, communicate, reproduce, copy, distribute, or publish any confidential information to any person or entity without prior written authorization.",
      "Not photograph, videotape, audio record, screenshot, or otherwise capture any information, equipment, documents, systems, or premises unless specifically authorized.",
      "Use any information obtained solely for the purpose of my authorized visit.",
      "Comply with all security, safety, health, and access control procedures prescribed by Building Management and the host organization.",
      "Follow all instructions issued by authorized personnel during my visit.",
    ],
  },
  {
    heading: "2. Protection of Information",
    body: [
      "I agree to exercise reasonable care and diligence to prevent unauthorized access, use, disclosure, or dissemination of any confidential information obtained during my visit.",
    ],
  },
  {
    heading: "3. Return and Destruction of Information",
    body: [
      "Upon request by Building Management or the host organization, I shall promptly return, destroy, or permanently delete any confidential materials, notes, photographs, recordings, or information in my possession.",
    ],
  },
  {
    heading: "4. Term of Confidentiality",
    body: [
      "The obligations contained in this Agreement shall remain valid during the visit and shall continue to remain in force for a period of five (5) years from the date of execution of this Agreement.",
    ],
  },
  {
    heading: "5. No Transfer of Rights",
    body: [
      "Nothing contained herein shall be construed as granting any ownership rights, licenses, or intellectual property rights to the Visitor.",
    ],
  },
  {
    heading: "6. Loss/Theft",
    body: ["Building management would be not responsible for theft/loss of items."],
  },
  {
    heading: "7. Compliance and Liability",
    body: ["The Visitor acknowledges that any breach of this Agreement may result in:"],
    bullets: [
      "Immediate removal from the premises",
      "Denial of future access",
      "Disciplinary, civil, or legal action as deemed appropriate by the affected parties",
    ],
  },
  {
    heading: "8. Declaration",
    body: [
      "I hereby certify that I have carefully read, understood, and voluntarily agree to abide by all the terms and conditions contained in this Visitor Non-Disclosure Agreement and Confidentiality Acknowledgment.",
    ],
  },
] as const;

function CheckInPageContent() {
  const params = useParams<{ siteToken?: string }>();
  const searchParams = useSearchParams();
  const siteToken = params?.siteToken ?? searchParams.get("site") ?? "site-1";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackCameraInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const successTimerRef = useRef<number | null>(null);
  const agreementScrollRef = useRef<HTMLDivElement | null>(null);
  const agreementHistoryActiveRef = useRef(false);
  const suppressAgreementPopRef = useRef(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreementReachedEnd, setAgreementReachedEnd] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [form, setForm] = useState({
    visitorName: "",
    mobileNumber: "",
    companyComingFrom: "",
    companyToVisit: "",
    purposeOfVisit: "Meeting",
    personToMeet: "",
    modeOfCommute: "Public Transport" as (typeof commuteOptions)[number],
    vehicleNumber: "",
    photo: null as File | null,
  });
  const siteName = useMemo(() => decodeURIComponent(siteToken), [siteToken]);
  const requiresVehicleNumber = form.modeOfCommute === "Personal Vehicle";
  const isFormReady =
    form.visitorName.trim().length > 0 &&
    form.mobileNumber.trim().length > 0 &&
    form.companyComingFrom.trim().length > 0 &&
    form.companyToVisit.trim().length > 0 &&
    form.purposeOfVisit.trim().length > 0 &&
    form.personToMeet.trim().length > 0 &&
    (!requiresVehicleNumber || form.vehicleNumber.trim().length > 0) &&
    Boolean(form.photo);
  const canSubmit = isFormReady && agreementAccepted && !submitting;

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
      void stopCamera();
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!agreementOpen) {
      return;
    }

    const historyState = { ...(window.history.state ?? {}), visitorAgreementOpen: true };
    window.history.pushState(historyState, "");
    agreementHistoryActiveRef.current = true;

    function handlePopState() {
      if (suppressAgreementPopRef.current) {
        suppressAgreementPopRef.current = false;
        return;
      }

      agreementHistoryActiveRef.current = false;
      setAgreementOpen(false);
      setAgreementChecked(false);
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [agreementOpen]);

  function resetForm() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setForm({
      visitorName: "",
      mobileNumber: "",
      companyComingFrom: "",
      companyToVisit: "",
      purposeOfVisit: "Meeting",
      personToMeet: "",
      modeOfCommute: "Public Transport",
      vehicleNumber: "",
      photo: null,
    });
    setPreviewUrl("");
    setMessage("");
    setShowSuccess(false);
    setAgreementOpen(false);
    setAgreementReachedEnd(false);
    setAgreementChecked(false);
    setAgreementAccepted(false);
  }

  function handlePhotoChange(file: File | null) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setForm((current) => ({ ...current, photo: file }));
    setPreviewUrl(file ? URL.createObjectURL(file) : "");
  }

  function handleRetake() {
    handlePhotoChange(null);
    void openCamera();
  }

  async function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  async function openCamera() {
    setCameraError("");

    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      fallbackCameraInputRef.current?.click();
      return;
    }

    try {
      await stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user"
        },
        audio: false
      });

      streamRef.current = stream;
      setCameraOpen(true);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "Unable to open the camera.");
      fallbackCameraInputRef.current?.click();
    }
  }

  function handleFallbackCameraChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    handlePhotoChange(file);
    event.target.value = "";
  }

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) {
      return;
    }

    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().then(() => setCameraReady(true)).catch(() => {
      setCameraError("Unable to start the live camera preview.");
    });
  }, [cameraOpen]);

  async function capturePhoto() {
    if (!videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const sourceWidth = video.videoWidth || 1280;
    const sourceHeight = video.videoHeight || 720;
    const scale = Math.min(1, 1280 / Math.max(sourceWidth, sourceHeight));
    canvas.width = Math.round(sourceWidth * scale);
    canvas.height = Math.round(sourceHeight * scale);

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Unable to capture the live photo.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.85);
    });

    if (!blob) {
      setCameraError("Unable to capture the live photo.");
      return;
    }

    handlePhotoChange(new File([blob], `visitor-${Date.now()}.jpg`, { type: "image/jpeg" }));
    setCameraOpen(false);
    await stopCamera();
  }

  async function handleSubmit() {
    if (!agreementAccepted) {
      setMessage("Please read and accept the Visitor Agreement before submitting.");
      return;
    }

    if (requiresVehicleNumber && !form.vehicleNumber.trim()) {
      setMessage("Vehicle Number is required for Personal Vehicle.");
      return;
    }

    if (!form.photo) {
      setMessage("Please capture a live photo before submitting.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const payload = new FormData();
    payload.set("siteToken", siteName);
    payload.set("visitorName", form.visitorName);
    payload.set("mobileNumber", form.mobileNumber);
    payload.set("companyComingFrom", form.companyComingFrom);
    payload.set("companyToVisit", form.companyToVisit);
    payload.set("purposeOfVisit", form.purposeOfVisit);
    payload.set("personToMeet", form.personToMeet);
    payload.set("modeOfCommute", form.modeOfCommute);
    payload.set("vehicleNumber", form.vehicleNumber);
    payload.set("agreementAccepted", "true");
    payload.set(
      "remarks",
      [
        `Company To Visit: ${form.companyToVisit}`,
        `Mode of Commute: ${form.modeOfCommute}`,
        requiresVehicleNumber ? `Vehicle Number: ${form.vehicleNumber}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
    if (form.photo) {
      payload.set("photo", form.photo);
    }

    const response = await fetch("/api/public/checkin", {
      method: "POST",
      body: payload,
    });

    const result = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      setMessage(result.message ?? "Unable to complete check-in.");
      return;
    }

    setShowSuccess(true);
    setMessage("");
    successTimerRef.current = window.setTimeout(() => {
      resetForm();
    }, 4000);
  }

  function handleAgreementScroll() {
    const element = agreementScrollRef.current;
    if (!element || agreementReachedEnd) {
      return;
    }

    const hasReachedBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 8;
    if (hasReachedBottom) {
      setAgreementReachedEnd(true);
    }
  }

  function handleAgreementOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      if (agreementHistoryActiveRef.current && window.history.state?.visitorAgreementOpen) {
        suppressAgreementPopRef.current = true;
        agreementHistoryActiveRef.current = false;
        window.history.back();
      }

      setAgreementOpen(false);
      if (!agreementAccepted) {
        setAgreementChecked(false);
      }
      return;
    }

    setAgreementOpen(true);
  }

  function handleAgreementAcceptance(checked: boolean) {
    setAgreementChecked(checked);
    if (!checked) {
      return;
    }

    setAgreementAccepted(true);
    setMessage("");
    handleAgreementOpenChange(false);
  }

  if (showSuccess) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#051622] px-6 py-12">
        <Card className="w-full max-w-2xl rounded-[28px] border-border/70 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle>Thank You!</CardTitle>
            <CardDescription>Your Check-In has been completed successfully.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-center">
            <p className="text-base text-foreground">Please proceed to the reception.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="bg-[#051622] px-6 py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <PublicHero
          title={`Welcome to ${siteName}`}
          subtitle="Please complete your visitor registration before entering the premises."
        />
        <Card className="w-full rounded-[28px] border-border/70 shadow-lg">
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Full Name</Label>
            <Input value={form.visitorName} onChange={(e) => setForm((c) => ({ ...c, visitorName: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Mobile Number</Label>
            <Input value={form.mobileNumber} onChange={(e) => setForm((c) => ({ ...c, mobileNumber: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Company Coming From</Label>
            <Input
              placeholder="Infosys"
              value={form.companyComingFrom}
              onChange={(e) => setForm((c) => ({ ...c, companyComingFrom: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Company To Visit</Label>
            <Input
              placeholder="AIHP Tower"
              value={form.companyToVisit}
              onChange={(e) => setForm((c) => ({ ...c, companyToVisit: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Purpose</Label>
            <Select value={form.purposeOfVisit} onValueChange={(value) => setForm((current) => ({ ...current, purposeOfVisit: value }))}>
              <SelectTrigger className="h-11 w-full rounded-xl px-3 text-sm">
                <SelectValue placeholder="Select purpose" />
              </SelectTrigger>
              <SelectContent>
                {purposeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Person To Meet</Label>
            <Input value={form.personToMeet} onChange={(e) => setForm((c) => ({ ...c, personToMeet: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Mode of Commute</Label>
            <Select
              value={form.modeOfCommute}
              onValueChange={(value: (typeof commuteOptions)[number]) =>
                setForm((current) => ({
                  ...current,
                  modeOfCommute: value,
                  vehicleNumber: value === "Personal Vehicle" ? current.vehicleNumber : "",
                }))
              }
            >
              <SelectTrigger className="h-11 w-full rounded-xl px-3 text-sm">
                <SelectValue placeholder="Select commute mode" />
              </SelectTrigger>
              <SelectContent>
                {commuteOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {requiresVehicleNumber ? (
            <div className="grid gap-2">
              <Label>Vehicle Number</Label>
              <Input value={form.vehicleNumber} onChange={(e) => setForm((c) => ({ ...c, vehicleNumber: e.target.value }))} />
            </div>
          ) : null}
          <div className="grid gap-3">
            <Label>Capture Photo</Label>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={() => void openCamera()}>
                <Camera className="mr-2 size-4" />
                Capture Photo
              </Button>
              {previewUrl ? (
                <Button type="button" variant="outline" onClick={handleRetake}>
                  <RefreshCcw className="mr-2 size-4" />
                  Retake
                </Button>
              ) : null}
            </div>
            {previewUrl ? (
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Captured visitor preview" className="h-64 w-full object-cover" />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/40 p-6 text-sm text-muted-foreground">
                Capture a live photo to continue. Supported browsers will open the live camera directly, and browsers with camera restrictions will use the device camera prompt.
              </div>
            )}
            <input
              ref={fallbackCameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handleFallbackCameraChange}
            />
            {cameraError ? <p className="text-sm font-medium text-primary">{cameraError}</p> : null}
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
            <p className="text-sm font-medium text-foreground">
              By continuing, you must read and accept the Visitor Agreement.
            </p>
            <Button
              type="button"
              variant="ghost"
              className="mt-3 h-auto justify-start px-0 text-primary hover:bg-transparent hover:text-primary"
              onClick={() => setAgreementOpen(true)}
            >
              <ExternalLink className="mr-2 size-4" />
              View Visitor Agreement
            </Button>
            {agreementAccepted ? (
              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="size-4" />
                <span>Visitor Agreement Accepted</span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Accepting the agreement is required before submission.</p>
            )}
          </div>
          <Button disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {submitting ? "Submitting..." : agreementAccepted ? "Submit" : "Submit (Agreement Required)"}
          </Button>
          {message ? <p className="text-sm font-medium text-primary">{message}</p> : null}
        </CardContent>
        </Card>
      </div>

      <Dialog open={agreementOpen} onOpenChange={handleAgreementOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="fixed inset-0 left-0 top-0 grid h-screen w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-background p-0 sm:max-w-none"
        >
          <DialogHeader className="border-b border-border/70 px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => handleAgreementOpenChange(false)}>
                Back
              </Button>
            </div>
            <DialogTitle>Visitor Agreement</DialogTitle>
            <DialogDescription>
              Read the agreement fully. The acceptance checkbox will unlock after you scroll to the bottom.
            </DialogDescription>
          </DialogHeader>

          <div
            ref={agreementScrollRef}
            onScroll={handleAgreementScroll}
            className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-6 py-5"
          >
            <div className="mx-auto max-w-3xl rounded-[24px] border border-border/70 bg-card p-6 shadow-sm">
              <div className="space-y-6 text-sm leading-6 text-foreground">
                {agreementSections.map((section) => (
                  <section key={section.heading} className="space-y-3">
                    <h3 className="text-base font-semibold text-foreground">{section.heading}</h3>
                    {section.body?.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.bullets?.length ? (
                      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                        {section.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                ))}
                <div
                  className={`rounded-2xl border border-border/70 p-4 ${
                    agreementReachedEnd ? "bg-emerald-50 text-slate-900" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <label className="flex items-start gap-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={agreementChecked}
                      disabled={!agreementReachedEnd}
                      onChange={(event) => handleAgreementAcceptance(event.target.checked)}
                      className="mt-0.5 size-4 accent-emerald-600 disabled:cursor-not-allowed"
                    />
                    <span className={agreementReachedEnd ? "text-slate-900" : "text-slate-700"}>
                      Tap here to accept the agreement. I have read and agree to the Visitor Agreement.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/70 bg-background px-6 py-4 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => handleAgreementOpenChange(false)}>
              Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {cameraOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-slate-950 p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">Live Photo Capture</p>
                <p className="text-sm text-slate-300">Take a live photo and confirm the preview.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() => {
                  setCameraOpen(false);
                  void stopCamera();
                }}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" disabled={!cameraReady} onClick={() => void capturePhoto()}>
                Capture Now
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() => {
                  setCameraOpen(false);
                  void stopCamera();
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function CheckInPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#051622]" />}>
      <CheckInPageContent />
    </Suspense>
  );
}
