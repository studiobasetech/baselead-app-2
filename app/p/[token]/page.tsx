"use client";

import { use, useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Download,
  FileSignature,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import SignaturePad from "@/components/proposals/SignaturePad";
import { formatMoney, type LineItem } from "@/lib/proposals";

type PublicProposal = {
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
  amount_due: number;
  status: string;
  client_name: string | null;
  signer_name: string | null;
  signed_at: string | null;
  signature_data: string | null;
  paid_at: string | null;
  amount_paid: number | null;
  created_at: string;
  can_pay: boolean;
};

type Company = {
  company_name: string | null;
  logo_url: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
} | null;

export default function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [proposal, setProposal] = useState<PublicProposal | null>(null);
  const [company, setCompany] = useState<Company>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/public/proposals/${token}`, { cache: "no-store" });
    const json = await response.json();

    if (!response.ok) {
      setError(json.error || "Proposal not found.");
      return;
    }

    setProposal(json.proposal);
    setCompany(json.company);
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();

    const payment = new URLSearchParams(window.location.search).get("payment");
    if (payment === "success") setNotice("Payment received. Thank you!");
    if (payment === "error") setNotice("The payment could not be confirmed. Please try again.");
  }, [load]);

  async function sign() {
    setBusy(true);
    setNotice("");

    const response = await fetch(`/api/public/proposals/${token}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, signature, agree }),
    });
    const json = await response.json();

    setBusy(false);

    if (!response.ok) {
      setNotice(json.error || "Could not sign.");
      return;
    }

    await load();
    setNotice(json.needsPayment ? "Signed! Complete the payment below to get started." : "Signed! Thank you.");
  }

  async function pay() {
    setBusy(true);

    const response = await fetch(`/api/public/proposals/${token}/pay`, { method: "POST" });
    const json = await response.json();

    if (!response.ok || !json.url) {
      setBusy(false);
      setNotice(json.error || "Could not start the payment.");
      return;
    }

    window.location.assign(json.url);
  }

  async function decline() {
    const reason = window.prompt("Would you like to tell us why? (optional)");
    if (reason === null) return;

    await fetch(`/api/public/proposals/${token}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    await load();
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-gray-400">
        {error}
      </main>
    );
  }

  if (!proposal) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-gray-500">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading proposal…
      </main>
    );
  }

  const money = (value: number) => formatMoney(value, proposal.currency);
  const signed = ["signed", "paid"].includes(proposal.status);
  const expired =
    !signed &&
    proposal.valid_until &&
    new Date(`${proposal.valid_until}T23:59:59`).getTime() < Date.now();
  const tax = Math.max(0, proposal.total - Math.max(0, proposal.subtotal - proposal.discount));

  return (
    <main className="proposal-page relative min-h-screen overflow-hidden bg-[#050505] px-4 py-8 text-white sm:py-14">
      <div className="no-print pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-violet-600/[0.14] blur-[150px]" />
      <div className="no-print pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-[#F5C518]/[0.07] blur-[150px]" />

      <article className="proposal-doc relative mx-auto w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0B0B0D]/80 shadow-[0_40px_120px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        {/* Header */}
        <header className="flex flex-col gap-6 border-b border-white/10 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-10">
          <div className="flex items-center gap-4">
            {company?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo_url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5C518] text-xl font-bold text-black">
                {(company?.company_name || "P").charAt(0)}
              </div>
            )}
            <div>
              <p className="text-lg font-semibold">{company?.company_name}</p>
              <p className="text-sm text-gray-500">
                {[company?.email, company?.phone, company?.website].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-[#F5C518]">Proposal</p>
            <p className="mt-1 text-sm text-gray-400">{proposal.number}</p>
            <p className="text-sm text-gray-500">
              {new Date(proposal.created_at).toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" })}
            </p>
            {proposal.valid_until && (
              <p className={`text-sm ${expired ? "text-[#F0475C]" : "text-gray-500"}`}>
                Valid until {new Date(`${proposal.valid_until}T12:00:00`).toLocaleDateString()}
              </p>
            )}
          </div>
        </header>

        <div className="p-6 sm:p-10">
          {proposal.client_name && <p className="text-sm text-gray-500">Prepared for</p>}
          <p className="text-lg text-gray-200">{proposal.client_name}</p>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">{proposal.title}</h1>

          {proposal.intro && (
            <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-gray-400">{proposal.intro}</p>
          )}

          {/* Items */}
          <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">Qty</th>
                  <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">Price</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {proposal.line_items.map((item, index) => (
                  <tr key={index} className="border-t border-white/[0.06] align-top">
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-100">{item.name}</p>
                      {item.description && (
                        <p className="mt-1 whitespace-pre-line text-xs leading-5 text-gray-500">{item.description}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-600 sm:hidden">
                        {item.quantity} × {money(item.price)}
                      </p>
                    </td>
                    <td className="hidden px-4 py-4 text-right text-gray-400 sm:table-cell">{item.quantity}</td>
                    <td className="hidden px-4 py-4 text-right text-gray-400 sm:table-cell">{money(item.price)}</td>
                    <td className="px-4 py-4 text-right font-medium tabular-nums">{money(item.quantity * item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{money(proposal.subtotal)}</dd>
            </div>
            {proposal.discount > 0 && (
              <div className="flex justify-between text-[#84CC16]">
                <dt>Discount</dt>
                <dd className="tabular-nums">−{money(proposal.discount)}</dd>
              </div>
            )}
            {proposal.tax_rate > 0 && (
              <div className="flex justify-between text-gray-400">
                <dt>Tax ({proposal.tax_rate}%)</dt>
                <dd className="tabular-nums">{money(tax)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-white/10 pt-3 text-lg font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums text-[#F5C518]">{money(proposal.total)}</dd>
            </div>
            {proposal.payment_mode === "deposit" && (
              <div className="flex justify-between text-gray-400">
                <dt>Due to start ({proposal.deposit_percent}%)</dt>
                <dd className="tabular-nums">{money(proposal.amount_due)}</dd>
              </div>
            )}
          </dl>

          {proposal.terms && (
            <section className="mt-10">
              <h2 className="text-sm font-semibold text-gray-300">Terms</h2>
              <p className="mt-2 whitespace-pre-line text-xs leading-6 text-gray-500">{proposal.terms}</p>
            </section>
          )}

          {/* Status / actions */}
          <section className="mt-10 border-t border-white/10 pt-8">
            {notice && (
              <p className="no-print mb-5 rounded-xl border border-[#60A5FA]/30 bg-[#60A5FA]/10 px-4 py-3 text-sm text-[#BFDBFE]">
                {notice}
              </p>
            )}

            {proposal.status === "declined" && (
              <p className="flex items-center gap-2 text-sm text-gray-400">
                <XCircle size={18} className="text-[#F0475C]" /> This proposal was declined.
              </p>
            )}

            {signed && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm text-[#84CC16]">
                    <CheckCircle2 size={18} /> Signed by {proposal.signer_name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {proposal.signed_at && new Date(proposal.signed_at).toLocaleString()}
                  </p>
                  {proposal.signature_data && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={proposal.signature_data}
                      alt="Signature"
                      className="mt-3 h-20 rounded-xl bg-white px-3"
                    />
                  )}
                </div>

                {proposal.status === "paid" && (
                  <p className="flex items-center gap-2 text-sm text-[#84CC16]">
                    <CreditCard size={18} /> Paid {money(proposal.amount_paid ?? 0)}
                  </p>
                )}
              </div>
            )}

            {proposal.status === "signed" && proposal.amount_due > 0 && (
              <div className="no-print mt-6">
                {proposal.can_pay ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void pay()}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F5C518] text-sm font-semibold text-black shadow-[0_8px_30px_rgba(245,197,24,0.25)] transition hover:bg-[#ffe044] disabled:opacity-60"
                  >
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                    Pay {money(proposal.amount_due)} securely
                  </button>
                ) : (
                  <p className="text-sm text-gray-500">
                    The team will send you payment details shortly.
                  </p>
                )}
              </div>
            )}

            {!signed && proposal.status !== "declined" && !expired && (
              <div className="no-print">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <FileSignature size={20} className="text-[#F5C518]" /> Accept and sign
                </h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="text-xs text-gray-500">Full name *</span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-sm outline-none focus:border-[#F5C518]/50"
                    />
                  </label>
                  <label>
                    <span className="text-xs text-gray-500">Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-sm outline-none focus:border-[#F5C518]/50"
                    />
                  </label>
                </div>

                <div className="mt-4">
                  <SignaturePad onChange={setSignature} />
                </div>

                <label className="mt-4 flex items-start gap-3 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(event) => setAgree(event.target.checked)}
                    className="mt-1 accent-[#F5C518]"
                  />
                  I agree to this proposal and its terms, and that my electronic signature is legally binding.
                </label>

                <button
                  type="button"
                  disabled={busy || !name.trim() || !signature || !agree}
                  onClick={() => void sign()}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F5C518] text-sm font-semibold text-black shadow-[0_8px_30px_rgba(245,197,24,0.25)] transition hover:bg-[#ffe044] disabled:opacity-50"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Sign proposal
                  {proposal.payment_mode !== "none" && proposal.can_pay ? " & continue to payment" : ""}
                </button>

                <button
                  type="button"
                  onClick={() => void decline()}
                  className="mt-3 w-full text-center text-xs text-gray-500 transition hover:text-[#F0475C]"
                >
                  Decline proposal
                </button>
              </div>
            )}

            {expired && (
              <p className="text-sm text-[#F0475C]">This proposal has expired. Please contact us for an updated version.</p>
            )}
          </section>
        </div>
      </article>

      <div className="no-print mt-6 flex justify-center">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs text-gray-400 transition hover:text-white"
        >
          <Download size={14} /> Download PDF
        </button>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body::after { display: none !important; }
          .proposal-page { background: #fff !important; color: #111 !important; padding: 0 !important; }
          .proposal-doc { background: #fff !important; box-shadow: none !important; border: 0 !important; backdrop-filter: none !important; }
          .proposal-doc * { color: #111 !important; border-color: #e5e7eb !important; background-image: none !important; }
          .proposal-doc thead { background: #f3f4f6 !important; }
        }
      `}</style>
    </main>
  );
}
