"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";


const initial = {
  name: "",
  email: "",
  phone: "",
  message: "",
};

export default function ContactPage() {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@amauralabs.com";

  function update(key: keyof typeof initial, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("idle");
    try {
      // Form submission logic would go here.
      // E.g., fetch("/api/contact", { method: "POST", body: JSON.stringify(form) })
      await new Promise((resolve) => setTimeout(resolve, 500));
      setForm(initial);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_420px]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Contact</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-slate-950">Talk to Amaura Labs about CareerPath AI.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Use this for support, college pilots, manual packs, billing help, refund requests, or launch partnerships.
          </p>
          <div className="mt-6 flex items-center gap-3 text-slate-700">
            <Mail className="h-5 w-5 text-blue-700" />
            <a href={`mailto:${supportEmail}`} className="font-medium hover:underline">{supportEmail}</a>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Send a message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input required value={form.name} onChange={(event) => update("name", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone / WhatsApp</Label>
                <Input value={form.phone} onChange={(event) => update("phone", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea required rows={5} value={form.message} onChange={(event) => update("message", event.target.value)} />
              </div>
              {status === "sent" && <Alert variant="success">Message saved. We will follow up soon.</Alert>}
              {status === "error" && <Alert variant="error">Unable to save your message. Please try email instead.</Alert>}
              <Button type="submit" className="w-full">Send message</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
