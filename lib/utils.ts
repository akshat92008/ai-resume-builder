import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getApiError(data: unknown, fallback: string) {
  if (data instanceof Error) return data.message;
  if (typeof data === "object" && data && "error" in data) {
    const error = (data as any).error;
    if (typeof error === "string") return error;
    if (error?.message) return error.message;
  }
  return fallback;
}
