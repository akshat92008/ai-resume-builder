"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@/components/ui";
import { deleteAdminTestimonial, saveAdminTestimonial } from "@/lib/data/admin/admin-client";
import type { Testimonial } from "@/lib/types";

const empty = {
  name: "",
  role: "",
  college: "",
  quote: "",
  rating: 5,
  public: true,
};

export function AdminTestimonialsClient({ initialTestimonials }: { initialTestimonials: Testimonial[] }) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(initialTestimonials);
  const [form, setForm] = useState(empty);

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

  return (
    <>
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
              <p className="mt-4 text-sm italic text-slate-700">&quot;{testimonial.quote}&quot;</p>
              <div className="mt-5 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toggle(testimonial)}>
                  {testimonial.public ? "Hide" : "Show public"}
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => remove(testimonial)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
