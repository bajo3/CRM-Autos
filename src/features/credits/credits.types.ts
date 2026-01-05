export type CreditStatus = "active" | "closed";

export type CreditRow = {
  id: string;
  status: CreditStatus;
  closed_at: string | null;

  client_name: string;
  client_phone: string | null;

  vehicle_model: string | null;
  vehicle_version: string | null;
  vehicle_year: number | null;
  vehicle_kms: number | null;

  installment_amount: number;
  installment_count: number;
  start_date: string; // YYYY-MM-DD

  created_at: string;
  updated_at: string;
};

export type CreditInsert = Omit<
  CreditRow,
  "id" | "status" | "closed_at" | "created_at" | "updated_at"
> & {
  status?: CreditStatus;
  closed_at?: string | null;
};

export type CreditUpdate = Partial<CreditInsert>;
