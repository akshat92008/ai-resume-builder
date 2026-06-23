"use client";

import { useState } from "react";
import { CreditCard, IndianRupee, Upload } from "lucide-react";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@/components/ui";
import { getManualPaymentInstructions } from "@/lib/payments/manual";
import { manualServicePacks, pricingPlans } from "@/lib/plans";
import { getDemoOrders, getDemoVault, upsertDemoOrder } from "@/lib/storage";
import type { Order } from "@/lib/types";

export default function BillingPage() {
  const [orders, setOrders] = useState<Order[]>(() => getDemoOrders());
  const [email, setEmail] = useState(getDemoVault().profile.email);
  const [plan, setPlan] = useState("pro");
  const [reference, setReference] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [message, setMessage] = useState("");
  const instructions = getManualPaymentInstructions();
  const vault = getDemoVault();
  const paidOptions = [...pricingPlans.filter((item) => item.id !== "free" && item.id !== "college"), ...manualServicePacks.map((pack) => ({ id: pack.id, name: pack.name, price: pack.price }))];
  const selected = paidOptions.find((item) => item.id === plan) ?? paidOptions[0];

  async function createOrder() {
    if (!selected) return;
    const response = await fetch("/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, plan: selected.id, amount_inr: selected.price, metadata: { source: "billing" } }),
    });
    const data = (await response.json()) as { order?: Order };
    if (data.order) {
      upsertDemoOrder(data.order);
      setOrders(getDemoOrders());
      setMessage("Order created. Complete payment and submit reference.");
    }
  }

  async function submitProof(order: Order) {
    const updated: Order = { ...order, payment_reference: reference, payment_proof_url: proofUrl, status: "submitted" };
    upsertDemoOrder(updated);
    setOrders(getDemoOrders());
    await fetch("/api/orders/submit-proof", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id, payment_reference: reference, payment_proof_url: proofUrl }),
    });
    setMessage("Payment proof submitted. Admin can approve it from /admin/orders.");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Billing</p>
        <h1 className="font-display text-3xl font-bold text-slate-950">Plan, orders, and manual payments</h1>
        <p className="mt-2 text-slate-600">Manual payment mode works immediately. Gateways can be enabled later with env variables.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold capitalize">{vault.profile.plan ?? "free"}</div>
              <p className="mt-2 text-sm text-slate-500">Plan status: {vault.profile.plan_status ?? "active"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CreditCard className="h-8 w-8 text-blue-600" />
              <CardTitle>Create order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Plan or pack</Label>
                <Select value={plan} onChange={(event) => setPlan(event.target.value)}>
                  {paidOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.name} - ₹{option.price}</option>
                  ))}
                </Select>
              </div>
              <Button onClick={createOrder} className="w-full">
                <IndianRupee className="mr-2 h-4 w-4" />
                Create order
              </Button>
              {message && <Alert variant="success">{message}</Alert>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manual payment instructions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-4 text-sm">
                <div className="font-semibold">UPI ID</div>
                <div className="mt-1 break-all text-slate-600">{instructions.upiId || "Set NEXT_PUBLIC_UPI_ID"}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 text-sm">
                <div className="font-semibold">WhatsApp</div>
                <div className="mt-1 text-slate-600">{instructions.whatsapp || "Set NEXT_PUBLIC_PAYMENT_WHATSAPP"}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 text-sm md:col-span-2">
                <div className="font-semibold">Support email</div>
                <div className="mt-1 text-slate-600">{instructions.supportEmail}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orders.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-slate-50 p-8 text-center text-sm text-slate-500">No orders yet.</div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="rounded-lg border bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{order.plan}</div>
                        <div className="text-sm text-slate-500">₹{order.amount_inr} | {order.provider}</div>
                      </div>
                      <Badge>{order.status}</Badge>
                    </div>
                    {["pending", "submitted"].includes(order.status) && (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <Input placeholder="Payment reference ID" value={reference} onChange={(event) => setReference(event.target.value)} />
                        <Input placeholder="Screenshot URL" value={proofUrl} onChange={(event) => setProofUrl(event.target.value)} />
                        <Button variant="outline" onClick={() => submitProof(order)} className="md:col-span-2">
                          <Upload className="mr-2 h-4 w-4" />
                          Submit payment proof
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
