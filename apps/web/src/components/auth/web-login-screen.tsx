"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { loginAction } from "@/lib/auth/actions";
import type { AppRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { WebAIHPTextLogo } from "@/components/branding/web-aihp-text-logo";

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const roleOptions: Array<{ icon: string; label: string; value: AppRole }> = [
  { value: "admin", icon: "A", label: "Admin" },
  { value: "site_manager", icon: "S", label: "Site Manager" },
];

export function WebLoginScreen({ initialRole = "site_manager" }: { initialRole?: AppRole }) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<AppRole>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [isPending, startTransition] = useTransition();

  const emailError = useMemo(() => {
    if (!touched.email) {
      return "";
    }
    if (!email.trim()) {
      return "Email address is required.";
    }
    if (!validateEmail(email)) {
      return "Enter a valid email address.";
    }
    return "";
  }, [email, touched.email]);

  const passwordError = useMemo(() => {
    if (!touched.password) {
      return "";
    }
    if (!password.trim()) {
      return "Password is required.";
    }
    if (password.trim().length < 8) {
      return "Password must be at least 8 characters.";
    }
    return "";
  }, [password, touched.password]);

  const isFormValid = !emailError && !passwordError && email.trim().length > 0 && password.trim().length >= 8;

  async function handleSubmit() {
    setTouched({ email: true, password: true });
    if (!isFormValid) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await loginAction({
          role: selectedRole,
          email: email.trim(),
          password,
          rememberMe: true,
        });
        router.replace(result.redirectTo);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to sign in.");
      }
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(18,138,160,0.14),_transparent_28%),#f7f8fa] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
        <div className="overflow-hidden rounded-[28px] border border-[rgba(18,138,160,0.24)] bg-[#051622] px-5 py-5 text-center shadow-[0_10px_20px_rgba(5,22,34,0.16)]">
          <div className="relative">
            <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[rgba(18,138,160,0.18)]" />
            <div className="pointer-events-none absolute -bottom-8 -left-6 h-28 w-28 rounded-[28px] bg-[rgba(139,18,18,0.26)]" />
            <div className="relative mx-auto mb-3 inline-flex items-center justify-center rounded-[18px] border border-white/15 bg-white/5 px-5 py-3">
              <WebAIHPTextLogo size="md" />
            </div>
            <h1 className="relative text-[20px] font-extrabold text-white sm:text-[24px]">Visitor Management System</h1>
            <p className="relative mt-2 text-[13px] text-white/80 sm:text-sm">Secure Visitor Access &amp; Building Operations</p>
          </div>
        </div>

        <div className="rounded-[16px] border border-[#EFE5DF] bg-white p-5 shadow-[0_8px_16px_rgba(0,0,0,0.08)]">
          <h2 className="text-[24px] font-extrabold text-slate-900">Sign In</h2>

          <div className="mt-5 space-y-2">
            <label className="text-[15px] font-bold text-slate-900">Email Address</label>
            <div className={`flex min-h-[54px] items-center gap-3 rounded-2xl border bg-slate-50 px-4 ${emailError ? "border-[#A00000]" : "border-slate-200"}`}>
              <span className="w-5 text-center text-base font-bold text-slate-500">@</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                placeholder="Enter your email"
                className="min-w-0 flex-1 bg-transparent text-[16px] text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            {emailError ? <p className="text-xs text-[#A00000]">{emailError}</p> : null}
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-[15px] font-bold text-slate-900">Password</label>
            <div className={`flex min-h-[54px] items-center gap-3 rounded-2xl border bg-slate-50 px-4 ${passwordError ? "border-[#A00000]" : "border-slate-200"}`}>
              <span className="w-5 text-center text-base font-bold text-slate-500">*</span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                placeholder="Enter your password"
                className="min-w-0 flex-1 bg-transparent text-[16px] text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button type="button" onClick={() => setShowPassword((current) => !current)} className="text-sm font-bold text-slate-700">
                {showPassword ? (
                  <span className="inline-flex items-center gap-1"><EyeOff className="size-4" />Hide</span>
                ) : (
                  <span className="inline-flex items-center gap-1"><Eye className="size-4" />Show</span>
                )}
              </button>
            </div>
            {passwordError ? <p className="text-xs text-[#A00000]">{passwordError}</p> : null}
          </div>

          <Button className="mt-5 h-[54px] w-full rounded-2xl bg-[#A00000] text-[16px] font-extrabold hover:bg-[#8B1212]" disabled={!isFormValid || isPending} onClick={() => void handleSubmit()}>
            {isPending ? "Signing in..." : "Sign In"}
          </Button>

          <div className="mt-4 text-center">
            <Link href="/reception" className="text-sm font-bold text-[#A00000]">
              Visitor Check-In / Check-Out
            </Link>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[15px] font-bold text-slate-900">Select Role</p>
          <div className="grid grid-cols-2 gap-3">
            {roleOptions.map((role) => {
              const selected = selectedRole === role.value;
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value)}
                  className={`flex min-h-[76px] items-center justify-between rounded-[18px] border bg-white px-4 py-3 text-left shadow-sm ${
                    selected ? "border-[#A00000] bg-[#FDECEC]" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${selected ? "bg-[#FDECEC]" : "bg-slate-100"}`}>
                      <span className={`text-sm font-extrabold ${selected ? "text-[#A00000]" : "text-slate-500"}`}>{role.icon}</span>
                    </div>
                    <span className="text-[15px] font-bold text-slate-900">{role.label}</span>
                  </div>
                  {selected ? <span className="text-xl font-extrabold text-[#A00000]">✓</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
