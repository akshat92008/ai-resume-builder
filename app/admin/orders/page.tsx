"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { AdminTable } from "@/components/admin/AdminTable";
import { Badge, Button } from "@/components/ui";
import { approveAdminOrder, getAdminOrders, rejectAdminOrder } from "@/lib/repositories";
import type { Order } from "@/lib/types";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getAdminOrders();
      setOrders(data);
      setLoading(false);
    }
    load();
  }, []);

  async function approve(order: Order) {
    const success = await approveAdminOrder(order.id);
    if (success) {
      setOrders(orders.map((item) => (item.id === order.id ? { ...item, status: "approved", approved_at: new Date().toISOString() } : item)));
    } else {
      alert("Failed to approve order");
    }
  }

  async function reject(order: Order) {
    const success = await rejectAdminOrder(order.id);
    if (success) {
      setOrders(orders.map((item) => (item.id === order.id ? { ...item, status: "rejected" } : item)));
    } else {
      alert("Failed to reject order");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <main className="mx-auto max-w-6xl space-y-6">
        <AdminHeader title="Orders" />
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
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
                {order.payment_proof_url && <a href={order.payment_proof_url} target="_blank" className="text-blue-700 hover:underline">Screenshot</a>}
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
        )}
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
