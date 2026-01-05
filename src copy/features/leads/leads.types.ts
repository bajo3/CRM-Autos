export type LeadStage =
  | "new"
  | "contacted"
  | "interested"
  | "negotiation"
  | "won"
  | "lost";

export type LeadRow = {
  id: string;
  name: string;
  phone: string | null;
  interest: string | null;
  stage: LeadStage;
  notes: string | null;
  assigned_to: string | null;
  vehicle_id: string | null;

  last_contact_at: string | null; // timestamptz ISO
  next_follow_up_at: string | null; // timestamptz ISO
  lost_reason: string | null;

  created_at: string;
  updated_at: string;
};

export type LeadInsert = {
  name: string;
  phone?: string | null;
  interest?: string | null;
  stage?: LeadStage;
  notes?: string | null;
  assigned_to?: string | null;
  vehicle_id?: string | null;
  next_follow_up_at?: string | null;
  lost_reason?: string | null;
};

export type LeadUpdate = Partial<LeadInsert> & {
  last_contact_at?: string | null;
};
