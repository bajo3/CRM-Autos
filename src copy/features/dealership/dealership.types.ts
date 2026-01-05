export type DealershipRow = {
  id: string;
  name: string;
  city: string | null;
  currency: string; // "ARS" etc.
  logo_url: string | null;
  created_at?: string;
  updated_at?: string;
};

export type DealershipUpdate = Partial<Pick<DealershipRow, "name" | "city" | "currency" | "logo_url">>;
