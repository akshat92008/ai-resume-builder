export * from "./data/client-repository";

export type AdminEvent = {
  id?: string;
  event_name: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AdminMetrics = {
  users: number;
  orders: number;
  leads: number;
  resumes: number;
  events: number;
};
