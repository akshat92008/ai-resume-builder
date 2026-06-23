"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { AdminTable } from "@/components/admin/AdminTable";
import { Badge, Button } from "@/components/ui";
import { getDemoOrders, getDemoVault, saveDemoVault, saveDemoOrders } from "@/lib/storage";
import type { Order } from "@/lib/types";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>(() => getDemoOrders());

  async function approve(order: Order) {
    const nextOrder: Order = { ...order, status: "approved", approved_at: new Date().toISOString(), approved_by: "demo-admin" };
    const nextOrders = orders.map((item) => (item.id === order.id ? nextOrder : item));
    setOrders(nextOrders);
    saveDemoOrders(nextOrders);
    const vault = getDemoVault();
    if (["pro", "lifetime"].includes(order.plan)) {
      saveDemoVault({ ...vault, profile: { ...vault.profile, plan: order.plan === "lifetime" ? "lifetime" : "pro", plan_status: "active" } });
    }
    await fetch("/api/admin/orders/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id, approved_by: "demo-admin" }),
    });
  }

  function reject(order: Order) {
    const nextOrders = orders.map((item) => (item.id === order.id ? { ...item, status: "rejected" as const } : item));
    setOrders(nextOrders);
    saveDemoOrders(nextOrders);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <main className="mx-auto max-w-6xl space-y-6">
        <AdminHeader title="Orders" />
        <AdminTable
          columns={["Order", "Customer", "Amount", "Provider", "Status", "Payment proof", "Actions"]}
          rows={orders.map((order) => [
            <div key="order">
              <div className="font-semibold">{order.plan}</div>
              <div className="text-xs text-slate-500">{order.id}</div>
            </div>,
            order.email,
            `₹${order.amount_inr}`,
            order.provider,
            <Badge key="status">{order.status}</Badge>,
            <div key="proof">
              <div>{order.payment_reference || "-"}</div>
              {order.payment_proof_url && <a href={order.payment_proof_url} className="text-blue-700 hover:underline">Screenshot</a>}
            </div>,
            <div key="actions" className="flex gap-2">
              <Button size="sm" onClick={() => approve(order)} disabled={order.status === "approved"}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => reject(order)} disabled={order.status === "approved"}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>,
          ])}
        />
      </main>
    </div>
  );
}

function AdminHeader({ title }: { title: string }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Admin</p>
        <h1 className="font-display text-3xl font-bold text-slate-950">{title}</h1>
      </div>
      <Button variant="outline" asChild><Link href="/admin">Back to admin</Link></Button>
    </div>
  );
}
