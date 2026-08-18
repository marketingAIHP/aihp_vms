"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme !== "light";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="gap-2 rounded-full"
    >
      {isDark ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
      {isDark ? "Light" : "Dark"}
    </Button>
  );
}

