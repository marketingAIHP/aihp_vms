export function WebAIHPTextLogo({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "sm" ? "text-[28px]" : size === "lg" ? "text-[42px]" : "text-[34px]";

  return (
    <div className={`flex items-center justify-center leading-none font-black tracking-[0.8px] text-white ${sizeClass}`}>
      <span>A</span>
      <span className="mx-[1px] text-[#A00000]">I</span>
      <span>HP</span>
    </div>
  );
}
