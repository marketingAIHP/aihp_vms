"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { forgotPasswordAction, loginAction } from "@/lib/auth/actions";
import type { AppRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({
  role,
  title,
  description,
  demoEmail,
  demoPassword,
}: {
  role: AppRole;
  title: string;
  description: string;
  demoEmail: string;
  demoPassword: string;
}) {
  const [email, setEmail] = useState(demoEmail);
  const [password, setPassword] = useState(demoPassword);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="border-border/70 bg-card/90 shadow-2xl shadow-black/10 backdrop-blur">
      <CardHeader className="space-y-3">
        <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <ShieldCheck className="size-5" />
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={(formData) => {
            formData.set("role", role);
            formData.set("email", email);
            formData.set("password", password);
            formData.set("rememberMe", String(rememberMe));

            startTransition(async () => {
              try {
                await loginAction({
                  role,
                  email,
                  password,
                  rememberMe,
                });
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to sign in.");
              }
            });
          }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor={`${role}-email`}>Email</Label>
            <Input
              id={`${role}-email`}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${role}-password`}>Password</Label>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() =>
                  startTransition(async () => {
                    try {
                      const result = await forgotPasswordAction({ email, role });
                      toast.success(result.message);
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Unable to send reset link.");
                    }
                  })
                }
              >
                Forgot Password
              </button>
            </div>
            <div className="relative">
              <Input
                id={`${role}-password`}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 inline-flex items-center text-muted-foreground"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="size-4 rounded border-border bg-background accent-primary"
            />
            Remember Me
          </label>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Signing in..." : `Sign in as ${role === "admin" ? "Admin" : "Site Manager"}`}
          </Button>
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Demo login: <span className="font-medium text-foreground">{demoEmail}</span> /{" "}
            <span className="font-medium text-foreground">{demoPassword}</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
