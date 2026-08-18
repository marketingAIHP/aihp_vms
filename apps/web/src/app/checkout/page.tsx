"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicHero } from "@/components/visitor/public-hero";

type VisitResponse = {
  id: string;
  visitorName: string;
  companyName: string;
  checkInAt: string;
  status: string;
};

function CheckOutPageContent() {
  const params = useParams<{ siteToken?: string }>();
  const searchParams = useSearchParams();
  const siteToken = params?.siteToken ?? searchParams.get("site") ?? "site-1";
  const [phoneNumber, setPhoneNumber] = useState("");
  const [visit, setVisit] = useState<VisitResponse | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const normalizedPhoneNumber = phoneNumber.trim();
  const canSearch = normalizedPhoneNumber.length > 0 && !loading;
  const siteName = useMemo(() => decodeURIComponent(siteToken), [siteToken]);

  async function lookupVisit() {
    if (!normalizedPhoneNumber) {
      setMessage("Mobile Number is required.");
      setVisit(null);
      setCompleted(false);
      return;
    }

    setLoading(true);
    setMessage("");
    setCompleted(false);
    const response = await fetch("/api/public/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: normalizedPhoneNumber, siteToken: siteName, action: "lookup" }),
    });
    const result = await response.json();
    setLoading(false);
    setVisit(result.visit ?? null);
    setMessage(result.message ?? "");
  }

  async function completeCheckOut() {
    if (!normalizedPhoneNumber) {
      setMessage("Mobile Number is required.");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/public/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: normalizedPhoneNumber, siteToken: siteName, action: "checkout" }),
    });
    const result = await response.json();
    setLoading(false);
    setVisit(result.visit ?? null);
    setCompleted(response.ok);
    setMessage(
      response.ok
        ? "Check-Out Completed Successfully.\nThank you for visiting.\nHave a safe journey."
        : (result.message ?? "")
    );
  }

  return (
    <main className="bg-[#051622] px-6 py-12">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <PublicHero
          title="Thank You for Visiting"
          subtitle="We hope you had a great experience."
        />
        <Card className="w-full rounded-[28px] border-border/70 shadow-lg">
        <CardContent className="grid gap-4">
          <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
            <p className="text-sm font-medium text-muted-foreground">Site</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{siteName}</p>
          </div>
          <div className="grid gap-2">
            <Label>Mobile Number</Label>
            <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          </div>
          <Button disabled={!canSearch} onClick={() => void lookupVisit()}>
            {loading ? "Searching..." : "Search Active Visit"}
          </Button>

          {visit ? (
            <div className="rounded-2xl border border-border/70 p-4 text-sm">
              <p><span className="font-medium">Visitor:</span> {visit.visitorName}</p>
              <p><span className="font-medium">Company:</span> {visit.companyName}</p>
              <p><span className="font-medium">Check-In Time:</span> {new Date(visit.checkInAt).toLocaleString()}</p>
              <p><span className="font-medium">Status:</span> {visit.status}</p>
              <Button className="mt-4" disabled={loading || visit.status !== "CHECKED_IN"} onClick={() => void completeCheckOut()}>
                CHECK OUT
              </Button>
            </div>
          ) : null}

          {message ? (
            <p className={`whitespace-pre-line text-sm ${completed ? "font-medium text-emerald-700" : "text-muted-foreground"}`}>{message}</p>
          ) : null}
        </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function CheckOutPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#051622]" />}>
      <CheckOutPageContent />
    </Suspense>
  );
}
