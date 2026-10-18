export type LineItem = {
  name: string;
  description?: string;
  quantity: number;
  price: number;
};

export type Proposal = {
  id: string;
  company_id: string | null;
  user_id: string | null;
  lead_id: string | null;
  number: string | null;
  title: string;
  intro: string | null;
  line_items: LineItem[];
  currency: string;
  discount: number;
  tax_rate: number;
  subtotal: number;
  total: number;
  terms: string | null;
  valid_until: string | null;
  payment_mode: "none" | "deposit" | "full";
  deposit_percent: number;
  status: "draft" | "sent" | "viewed" | "signed" | "paid" | "declined";
  public_token: string;
  client_name: string | null;
  client_email: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  signer_name: string | null;
  signature_data: string | null;
  paid_at: string | null;
  amount_paid: number | null;
  declined_at: string | null;
  created_at: string;
};

export function cleanItems(items: unknown): LineItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      name: String(item?.name ?? "").trim().slice(0, 200),
      description: String(item?.description ?? "").trim().slice(0, 1000),
      quantity: Math.max(0, Number(item?.quantity) || 0),
      price: Math.max(0, Number(item?.price) || 0),
    }))
    .filter((item) => item.name && item.quantity > 0)
    .slice(0, 50);
}

export function computeTotals(items: LineItem[], discount = 0, taxRate = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const afterDiscount = Math.max(0, subtotal - Math.max(0, discount));
  const tax = afterDiscount * (Math.max(0, taxRate) / 100);
  const total = Math.round((afterDiscount + tax) * 100) / 100;

  return { subtotal: Math.round(subtotal * 100) / 100, tax: Math.round(tax * 100) / 100, total };
}

/** Amount due now (deposit or full), in currency units. */
export function amountDue(proposal: Pick<Proposal, "payment_mode" | "deposit_percent" | "total">) {
  if (proposal.payment_mode === "full") return proposal.total;
  if (proposal.payment_mode === "deposit") {
    return Math.round(proposal.total * (proposal.deposit_percent / 100) * 100) / 100;
  }
  return 0;
}

export function formatMoney(value: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(value || 0);
}
