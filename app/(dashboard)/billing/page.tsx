"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, IndianRupee, Upload, Loader2 } from "lucide-react";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@/components/ui";
import { getManualPaymentInstructions } from "@/lib/payments/manual";
import { manualServicePacks, pricingPlans } from "@/lib/plans";
import { createOrder as createRepositoryOrder, getCurrentVault, getOrders, submitPaymentProof, getCurrentUser } from "@/lib/repositories";
import type { Order, UserVault } from "@/lib/types";

export default function BillingPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [vault, setVault] = useState<UserVault | null>(null);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("pro");
  const [reference, setReference] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [orderError, setOrderError] = useState("");

  const instructions = getManualPaymentInstructions();
  const paidOptions = [...pricingPlans.filter((item) => item.id !== "free" && item.id !== "college"), ...manualServicePacks.map((pack) => ({ id: pack.id, name: pack.name, price: pack.price }))];
  const selected = paidOptions.find((item) => item.id === plan) ?? paidOptions[0];

  const searchParams = useSearchParams();
  const orderParam = searchParams.get("order");

  const loadBilling = useCallback(async () => {
    const user = await getCurrentUser();
    const nextVault = await getCurrentVault();
    if (nextVault) {
      setVault(nextVault);
      setEmail(nextVault.profile.email || user?.email || "");
    }
    const fetchedOrders = await getOrders();
    if (orderParam) {
      const selectedOrderIndex = fetchedOrders.findIndex((o) => o.id === orderParam);
      if (selectedOrderIndex > -1) {
        const [selected] = fetchedOrders.splice(selectedOrderIndex, 1);
        fetchedOrders.unshift(selected);
      } else {
        setOrderError("Order not found or access denied. You can only view orders created by your account.");
      }
    }
    setOrders(fetchedOrders);
    setLoading(false);
  }, [orderParam]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBilling();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBilling]);

  async function createOrder() {
    if (!selected) return;
    try {
      setOrderError("");
      const result = await createRepositoryOrder({ email, plan: selected.id, amount_inr: selected.price, metadata: { source: "billing" } });
      router.push(`/billing?order=${result.id}`);
      setMessage("Order created. Complete payment and submit reference.");
    } catch (err: any) {
      setOrderError(err.message || "Failed to create order.");
    }
  }

  async function submitProof(order: Order) {
    try {
      setOrderError("");
      const result = await submitPaymentProof({ order_id: order.id, payment_reference: reference, payment_proof_url: proofUrl });
      if (result) {
        setOrders(orders.map(o => o.id === order.id ? result : o));
      } else {
        setOrders(await getOrders());
      }
      setMessage("Payment proof submitted. Waiting for admin approval.");
    } catch (err: any) {
      setOrderError(err.message || "Failed to submit proof.");
    }
  }

  if (loading || !vault) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
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
                {email ? (
                  <div className="text-sm font-medium text-slate-900">{email}</div>
                ) : (
                  <div className="text-sm text-red-600 font-medium">
                    Your account email is missing. Please update your profile before payment.
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Plan or pack</Label>
                <Select value={plan} onChange={(event) => setPlan(event.target.value)}>
                  {paidOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.name} - ₹{option.price}</option>
                  ))}
                </Select>
              </div>
              <Button onClick={createOrder} className="w-full" disabled={!email}>
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
              {orderError && <Alert variant="error">{orderError}</Alert>}
              {orders.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-slate-50 p-8 text-center text-sm text-slate-500">No orders yet.</div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className={`rounded-lg border p-4 ${order.id === orderParam ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'}`}>
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
