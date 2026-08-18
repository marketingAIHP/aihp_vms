import { WebAIHPTextLogo } from "@/components/branding/web-aihp-text-logo";

export function PublicHero({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[rgba(18,138,160,0.24)] bg-[#051622] px-5 py-5 text-center shadow-[0_10px_20px_rgba(5,22,34,0.16)]">
      <div className="relative">
        <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[rgba(18,138,160,0.18)]" />
        <div className="pointer-events-none absolute -bottom-8 -left-6 h-28 w-28 rounded-[28px] bg-[rgba(139,18,18,0.26)]" />
        <div className="relative mx-auto mb-3 inline-flex items-center justify-center rounded-[18px] border border-white/15 bg-white/5 px-5 py-3">
          <WebAIHPTextLogo size="md" />
        </div>
        <h1 className="relative text-[20px] font-extrabold text-white sm:text-[24px]">{title}</h1>
        <p className="relative mt-2 text-[13px] text-white/80 sm:text-sm">{subtitle}</p>
      </div>
    </div>
  );
}
