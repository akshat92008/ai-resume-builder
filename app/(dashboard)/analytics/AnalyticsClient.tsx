"use client";

import { ArrowLeft, TrendingUp, Target, Briefcase, XCircle } from "lucide-react";
import Link from "next/link";
import type { CareerLoopAnalyticsData } from "@/lib/careerloop/types";
import { ConversionIntelligencePanel } from "./ConversionIntelligencePanel";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

export function AnalyticsClient({ data }: { data: CareerLoopAnalyticsData }) {
  const { stats, charts } = data;
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-y-auto">
      <div className="flex-none p-6 pb-4 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"><ArrowLeft className="h-5 w-5" /></Link>
          <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">CareerLoop</p><h1 className="text-2xl font-bold tracking-tight text-slate-900">Conversion Intelligence</h1><p className="text-sm text-slate-500 mt-1">Learn which applications, resumes, sources, and targets actually create interviews.</p></div>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Applications Sent" value={stats.totalApplications} icon={<Briefcase className="h-5 w-5 text-blue-500" />} />
            <StatCard title="Interviews" value={stats.interviews} icon={<Target className="h-5 w-5 text-amber-500" />} />
            <StatCard title="Offers" value={stats.offers} icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} />
            <StatCard title="Rejections" value={stats.rejections} icon={<XCircle className="h-5 w-5 text-red-500" />} />
          </div>

          <ConversionIntelligencePanel data={data.conversionIntelligence} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-semibold text-slate-900 mb-4">Conversion Rates</h3><div className="space-y-4">
                <RateRow label="Application to Interview" value={stats.interviewRate} className="bg-amber-400" />
                <RateRow label="Interview to Offer" value={stats.offerRate} className="bg-emerald-400" />
              </div></div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-semibold text-slate-900 mb-4">Pipeline Status</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={charts.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{charts.statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie><Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} /></PieChart></ResponsiveContainer></div><div className="flex flex-wrap gap-3 justify-center mt-2">{charts.statusData.map((s, i) => <div key={i} className="flex items-center text-xs text-slate-600"><div className="w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: s.fill }} />{s.name} ({s.value})</div>)}</div></div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-semibold text-slate-900 mb-4">Application Velocity (Last 30 Days)</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={charts.timeSeriesData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dx={-10} /><Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} cursor={{ stroke: "#cbd5e1", strokeWidth: 1, strokeDasharray: "3 3" }} /><Line type="monotone" dataKey="applications" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div></div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-semibold text-slate-900 mb-4">Search Funnel</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={charts.funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 14, fill: "#334155", fontWeight: 500 }} /><Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} /><Bar dataKey="value" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={32} /></BarChart></ResponsiveContainer></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RateRow({ label, value, className }: { label: string; value: number; className: string }) {
  return <div><div className="flex justify-between text-sm mb-1"><span className="text-slate-600">{label}</span><span className="font-bold text-slate-900">{value}%</span></div><div className="w-full bg-slate-100 rounded-full h-2"><div className={`${className} h-2 rounded-full`} style={{ width: `${Math.min(100, value)}%` }} /></div></div>;
}

function StatCard({ title, value, icon }: { title: string; value: number | string; icon: React.ReactNode }) {
  return <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"><div><p className="text-sm font-medium text-slate-500 mb-1">{title}</p><p className="text-2xl font-bold text-slate-900">{value}</p></div><div className="p-3 bg-slate-50 rounded-lg">{icon}</div></div>;
}
