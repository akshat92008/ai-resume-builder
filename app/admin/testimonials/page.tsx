"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@/components/ui";
import { deleteAdminTestimonial, getAdminTestimonials, saveAdminTestimonial } from "@/lib/repositories";
import type { Testimonial } from "@/lib/types";

const empty = {
  name: "",
  role: "",
  college: "",
  quote: "",
  rating: 5,
  public: true,
};

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);

  const loadTestimonials = useCallback(async () => {
    setTestimonials(await getAdminTestimonials());
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTestimonials();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTestimonials]);

  function update<K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function add() {
    const saved = await saveAdminTestimonial({ ...form, demo: false });
    setTestimonials([saved, ...testimonials.filter((item) => item.id !== saved.id)]);
    setForm(empty);
  }

  async function toggle(item: Testimonial) {
    const saved = await saveAdminTestimonial({ ...item, public: !item.public });
    setTestimonials(testimonials.map((testimonial) => (testimonial.id === item.id ? saved : testimonial)));
  }

  async function remove(item: Testimonial) {
    await deleteAdminTestimonial(item.id);
    setTestimonials(testimonials.filter((t) => t.id !== item.id));
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <main className="mx-auto max-w-6xl space-y-6">
        <AdminHeader title="Testimonials" />
        <Card>
          <CardHeader>
            <CardTitle>Add testimonial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Name" value={form.name} onChange={(value) => update("name", value)} />
              <Field label="Role" value={form.role} onChange={(value) => update("role", value)} />
              <Field label="College" value={form.college} onChange={(value) => update("college", value)} />
            </div>
            <div className="space-y-2">
              <Label>Quote</Label>
              <Textarea value={form.quote} rows={4} onChange={(event) => update("quote", event.target.value)} />
            </div>
            <Button onClick={add}>
              <Plus className="mr-2 h-4 w-4" />
              Add testimonial
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-slate-500">{testimonial.role}, {testimonial.college}</div>
                  </div>
                  <div className="flex gap-2">
                    {testimonial.demo && <Badge variant="secondary">Demo</Badge>}
                    <Badge>{testimonial.public ? "Public" : "Hidden"}</Badge>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-700">&quot;{testimonial.quote}&quot;</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggle(testimonial)}>
                    {testimonial.public ? "Hide" : "Publish"}
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => remove(testimonial)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
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
