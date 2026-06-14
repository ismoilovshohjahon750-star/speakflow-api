import logo from "@/assets/nova-logo.png";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <img src={logo} alt="Nova" width={size} height={size} className="block" />
      <span className="font-semibold tracking-tight text-lg nova-text">Nova</span>
    </div>
  );
}