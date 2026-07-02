"use client";

import { Loader2, CheckCircle2, Circle } from "lucide-react";

export type StreamStep = {
  id: string;
  label: string;
  status: "pending" | "active" | "complete" | "error";
};

type StreamingProgressProps = {
  steps: StreamStep[];
  className?: string;
};

export function StreamingProgress({ steps, className = "" }: StreamingProgressProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        
        return (
          <div key={step.id} className="relative flex items-start gap-4">
            {!isLast && (
              <div 
                className={`absolute left-[11px] top-8 w-0.5 h-full -mb-8 ${
                  step.status === "complete" ? "bg-indigo-500" : "bg-slate-200"
                }`}
              />
            )}
            
            <div className="relative z-10 flex-shrink-0 bg-white">
              {step.status === "complete" ? (
                <CheckCircle2 className="h-6 w-6 text-indigo-500" />
              ) : step.status === "active" ? (
                <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
              ) : step.status === "error" ? (
                <XCircle className="h-6 w-6 text-red-500" />
              ) : (
                <Circle className="h-6 w-6 text-slate-300" />
              )}
            </div>
            
            <div className="flex-1 pb-4 pt-0.5">
              <p className={`text-sm font-medium ${
                step.status === "complete" || step.status === "active" 
                  ? "text-slate-900" 
                  : "text-slate-400"
              }`}>
                {step.label}
              </p>
              {step.status === "active" && (
                <p className="text-xs text-slate-500 mt-1 animate-pulse">
                  Working on it...
                </p>
              )}
              {step.status === "error" && (
                <p className="text-xs text-red-500 mt-1">
                  Failed. Please try again.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Ensure XCircle is imported for the error state above
import { XCircle } from "lucide-react";
