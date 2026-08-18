import { BellDot, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export function PageHeader({
  title,
  description,
  userName,
}: {
  title: string;
  description: React.ReactNode;
  userName: string;
}) {
  return (
    <div className="border-b border-border/70 px-6 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <div className="mt-1 text-sm text-muted-foreground">{description}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="w-72 pl-9" placeholder="Search visitors, sites, reports..." />
          </div>
          <button className="relative inline-flex size-10 items-center justify-center rounded-full border border-border bg-card">
            <BellDot className="size-4" />
          </button>
          <div className="inline-flex items-center gap-3 rounded-full border border-border bg-card px-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium md:inline">{userName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
