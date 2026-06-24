"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { AdminTable } from "@/components/admin/AdminTable";
import { Badge, Button } from "@/components/ui";
import { approveAdminOrder, rejectAdminOrder } from "@/lib/data/admin/admin-client";
import type { Order } from "@/lib/types";

export function AdminOrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);

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
  );
}
