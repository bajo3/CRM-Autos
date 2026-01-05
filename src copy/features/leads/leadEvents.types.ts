export type LeadEventType =
  | "created"
  | "updated"
  | "stage_changed"
  | "assigned"
  | "contacted"
  | "followup_set"
  | "note";

export type LeadEventRow = {
  id: string;
  lead_id: string;
  type: LeadEventType;
  message: string | null;
  meta: any | null;
  created_by: string | null;
  created_at: string;
};
