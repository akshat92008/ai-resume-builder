import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import type { ProofScoreResult } from "@/lib/types";
import { ProofBreakdown } from "./ProofBreakdown";

export function ProofScoreCard({ result }: { result: ProofScoreResult }) {
  const tone =
    result.grade === "Excellent"
      ? "bg-emerald-50 text-emerald-700"
      : result.grade === "Strong"
        ? "bg-blue-50 text-blue-700"
        : result.grade === "Average"
          ? "bg-amber-50 text-amber-700"
          : "bg-red-50 text-red-700";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Proof Score</CardTitle>
          <Badge className={tone}>{result.grade}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="text-5xl font-bold tracking-tight text-slate-950">
            {result.total}<span className="text-xl font-normal text-slate-400">/100</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">Measures how many career claims connect to real evidence.</p>
        </div>
        <ProofBreakdown breakdown={result.breakdown} />
      </CardContent>
    </Card>
  );
}
