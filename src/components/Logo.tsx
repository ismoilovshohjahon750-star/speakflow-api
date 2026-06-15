import logo from "@/assets/nova-logo.png";

export function Logo({ size = 36, hideText = false, textClass = "text-xl" }: { size?: number; hideText?: boolean; textClass?: string }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <img src={logo} alt="Nova" width={size} height={size} className="block rounded-lg" style={{ height: size, width: size }} />
      {!hideText && (
        <span className={`font-bold tracking-tight nova-text leading-none ${textClass}`}>Nova</span>
      )}
    </div>
  );
}