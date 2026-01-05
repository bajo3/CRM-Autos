export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "open" | "done";
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

  created_at: string;
  updated_at: string;
};

export type TaskInsert = {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_at?: string | null;
  assigned_to?: string | null;
  audience?: TaskAudience;
};

export type TaskUpdate = Partial<TaskInsert> & {
  id: string;
};
