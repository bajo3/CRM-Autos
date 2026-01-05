export type EntityType = "lead" | "vehicle" | "credit" | "client";

export type CrmEventRow = {
  id: string;
  dealership_id: string | null;
  entity_type: EntityType;
  entity_id: string;
  type: string;
  payload: any | null;
  created_by: string | null;
  created_at: string;
};
