"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { manualServicePacks, pricingPlans } from "@/lib/plans";
import { saveLead } from "@/lib/leads";
import { trackEvent } from "@/lib/events";
import { upsertDemoOrder } from "@/lib/storage";
import type { Order } from "@/lib/types";

export function PricingCards() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  async function createOrder(plan: string, amount: number) {
    if (plan === "college") {
      router.push("/college-pilot");
      return;
    }
    if (plan === "free") {
      router.push("/proof-score");
      return;
    }
    if (!email) {
      window.alert("Enter your email before creating an order.");
      return;
    }
    setBusyPlan(plan);
    await trackEvent("upgrade_clicked", { plan, amount });
    await saveLead({
      type: "pricing_interest",
      name: email.split("@")[0],
      email,
      source: "pricing",
      metadata: { plan, amount },
    });

    const response = await fetch("/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, plan, amount_inr: amount, metadata: { source: "pricing" } }),
    });
    const data = (await response.json()) as { order?: Order };
    if (data.order) {
      upsertDemoOrder(data.order);
      router.push("/billing");
    }
    setBusyPlan(null);
  }

  return (
    <div className="space-y-10">
      <div className="mx-auto max-w-md space-y-2">
        <Label>Email for order receipt</Label>
        <Input value={email} placeholder="you@example.com" type="email" onChange={(event) => setEmail(event.target.value)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        {pricingPlans.map((plan) => (
          <Card key={plan.id} className={plan.id === "pro" ? "border-blue-300 shadow-md" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                {plan.id === "pro" && <Badge>Early access</Badge>}
              </div>
              <div className="pt-3 text-3xl font-bold text-slate-950">{plan.label}</div>
              <p className="text-sm text-slate-500">{plan.description}</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant={plan.id === "free" ? "outline" : "default"} onClick={() => createOrder(plan.id, plan.price)} disabled={busyPlan === plan.id}>
                <CreditCard className="mr-2 h-4 w-4" />
                {busyPlan === plan.id ? "Creating..." : plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="text-2xl font-bold text-slate-950">Manual Service Packs</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {manualServicePacks.map((pack) => (
            <Card key={pack.id}>
              <CardHeader>
                <CardTitle>{pack.name}</CardTitle>
                <div className="text-3xl font-bold">₹{pack.price}+</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {pack.deliverables.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant="outline" onClick={() => createOrder(pack.id, pack.price)} disabled={busyPlan === pack.id}>
                  Order pack
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
