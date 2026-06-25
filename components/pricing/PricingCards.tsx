"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, CreditCard } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { manualServicePacks, pricingPlans } from "@/lib/plans";
import { createOrder as createRepositoryOrder, saveLead } from "@/lib/repositories";
import { trackEvent } from "@/lib/events";

export function PricingCards({ userEmail }: { userEmail?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get("plan");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  useEffect(() => {
    // If a plan was selected before login, highlight it or prepare for it
    // The current UI highlights Pro by default, but we can visually scroll or auto-select if needed.
    // For now, we just pass the plan query param if not logged in.
  }, [initialPlan]);

  async function createOrder(plan: string, amount: number) {
    if (plan === "college") {
      router.push("/college-pilot");
      return;
    }
    if (plan === "free") {
      router.push("/proof-score");
      return;
    }
    if (!userEmail) {
      router.push(`/signup?next=/pricing&plan=${plan}`);
      return;
    }
    const emailToUse = userEmail;
    setBusyPlan(plan);
    await trackEvent("upgrade_clicked", { plan, amount });
    await saveLead({
      type: "pricing_interest",
      name: emailToUse.split("@")[0],
      email: emailToUse,
      source: "pricing",
      metadata: { plan, amount },
    });

    try {
      const order = await createRepositoryOrder({ email: emailToUse, plan, amount_inr: amount, metadata: { source: "pricing" } });
      if (order.checkout_url) {
        window.location.assign(order.checkout_url);
        return;
      }
      router.push(`/billing?order=${order.id}`);
    } catch {
      window.alert("Unable to create this order. Please try again.");
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <div className="space-y-10">

      <div className="grid gap-5 lg:grid-cols-4">
        {pricingPlans.map((plan) => {
          const isSelected = initialPlan === plan.id || plan.id === "pro";
          return (
            <Card key={plan.id} className={isSelected ? "border-blue-400 shadow-lg ring-2 ring-blue-100" : ""}>
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
                  {busyPlan === plan.id ? "Creating..." : (initialPlan === plan.id && userEmail) ? `Create order for ₹${plan.price} ${plan.name}` : plan.cta}
                </Button>
              </CardContent>
            </Card>
          );
        })}
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
