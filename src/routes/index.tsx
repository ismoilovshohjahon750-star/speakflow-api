import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { MessageSquare, Mic, ImageIcon, Code2, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nova — One AI for everything" },
      { name: "description", content: "Chat, voice, images and code in a single calm AI. Start free with 250 credits." },
      { property: "og:title", content: "Nova — One AI for everything" },
      { property: "og:description", content: "Multimodal AI: text, voice, images, code. Free 250 credits to start." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full opacity-30 blur-3xl nova-gradient" />
        <div className="absolute -bottom-40 -right-40 w-[40rem] h-[40rem] rounded-full opacity-20 blur-3xl nova-gradient" />
      </div>

      <header className="relative max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground px-3 py-2">
            {t("nav.signin")}
          </Link>
          <Link to="/auth">
            <Button size="sm" className="nova-gradient text-white border-0 nova-glow hover:opacity-95">
              {t("nav.getstarted")} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> {t("brand.tag")}
        </div>
        <h1 className="mt-6 text-5xl sm:text-7xl font-semibold tracking-tight leading-[1.05]">
          <span className="nova-text">{t("land.headline")}</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
          {t("land.sub")}
        </p>
        <div className="mt-10 flex justify-center">
          <Link to="/auth">
            <Button size="lg" className="nova-gradient text-white border-0 nova-glow text-base h-12 px-6">
              {t("land.cta")} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Feature icon={<MessageSquare />} t={t("land.feat1.t")} d={t("land.feat1.d")} />
          <Feature icon={<Mic />} t={t("land.feat2.t")} d={t("land.feat2.d")} />
          <Feature icon={<ImageIcon />} t={t("land.feat3.t")} d={t("land.feat3.d")} />
          <Feature icon={<Code2 />} t={t("land.feat4.t")} d={t("land.feat4.d")} />
        </div>
      </main>

      <footer className="relative max-w-5xl mx-auto px-6 py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Nova
      </footer>
    </div>
  );
}

function Feature({ icon, t, d }: { icon: React.ReactNode; t: string; d: string }) {
  return (
    <div className="text-left p-5 rounded-2xl border border-border bg-card hover:nova-glow transition">
      <div className="h-9 w-9 rounded-xl nova-gradient text-white flex items-center justify-center mb-3 [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </div>
      <div className="font-medium">{t}</div>
      <div className="text-sm text-muted-foreground mt-1">{d}</div>
    </div>
  );
}
