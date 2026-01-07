export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "open" | "done" | "canceled";
export type TaskAudience = "private" | "team";

export type TaskRow = {
  id: string;
  dealership_id: string;
  created_by: string | null;
  assigned_to: string | null;
  audience: TaskAudience;

  title: string;
  description: string | null;

  priority: TaskPriority;
  status: TaskStatus;

  due_at: string | null;
  done_at: string | null;
  canceled_at: string | null;

  entity_type: "lead" | "vehicle" | "credit" | "client" | null;
  entity_id: string | null;

  created_at: string;
  updated_at: string;
};

export type TaskEntityType = "lead" | "vehicle" | "credit" | "client";

export type TaskInsert = {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_at?: string | null;
  assigned_to?: string | null;
  audience?: TaskAudience;
  entity_type?: TaskEntityType | null;
  entity_id?: string | null;
  canceled_at?: string | null;
};

export type TaskUpdate = Partial<TaskInsert> & {
  id: string;
};
