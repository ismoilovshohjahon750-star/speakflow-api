import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/pricing")({
  component: PricingPage,
});

const PACKAGES = [
  { id: "starter", name: "Starter", credits: 1000, price: 5, popular: false },
  { id: "pro", name: "Pro", credits: 5000, price: 20, popular: true },
  { id: "business", name: "Business", credits: 25000, price: 80, popular: false },
  { id: "enterprise", name: "Enterprise", credits: 100000, price: 250, popular: false },
];

function PricingPage() {
  const { t } = useI18n();
  const onBuy = () => {
    toast.info("Connect Stripe in Project Settings to enable live checkout.");
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold tracking-tight nova-text">{t("pricing.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("pricing.sub")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PACKAGES.map((p) => (
            <Card key={p.id} className={p.popular ? "border-primary nova-glow" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{p.name}</span>
                  {p.popular && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full nova-gradient text-white">Popular</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-4xl font-semibold">${p.price}</div>
                  <div className="text-sm text-muted-foreground">{p.credits.toLocaleString()} credits</div>
                </div>
                <ul className="text-sm space-y-1.5 text-muted-foreground">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> Chat with Nova</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> Image generation</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> Voice in & out</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> Never expires</li>
                </ul>
                <Button onClick={onBuy} className="w-full nova-gradient text-white border-0">
                  {t("pricing.buy")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}