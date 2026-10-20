"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { AlertTriangle, Crown, Filter, Mail, Medal, MessageSquareReply, Target, Trophy, Video, FileSignature } from "lucide-react";

import PlanGate from "@/components/plans/PlanGate";
import { formatMoney } from "@/lib/proposals";

type Rep = {
  userId: string;
  name: string;
  email: string;
  role: string;
  goal: number | null;
  leads: number;
  emails: number;
  replies: number;
  meetings: number;
  proposals: number;
  wonDeals: number;
  wonValue: number;
  monthWonValue: number;
  openTasks: number;
  overdueTasks: number;
  lastActivity: string | null;
};

const STAGE_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  responded: "Responded",
  meeting: "Meeting",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
};

const STAGE_COLOR: Record<string, string> = {
  new: "#E5E7EB",
  contacted: "#F5C518",
  responded: "#2DD4BF",
  meeting: "#F22F46",
  qualified: "#3B82F6",
  proposal: "#A78BFA",
  negotiation: "#F97316",
  won: "#84CC16",
};

export default function TeamPerformancePage() {
  const [days, setDays] = useState(30);
  const [reps, setReps] = useState<Rep[]>([]);
  const [funnel, setFunnel] = useState<{ stage: string; count: number }[]>([]);
  const [canEditGoals, setCanEditGoals] = useState(false);
  const [error, setError] = useState<{ message: string; plan?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/team/performance?days=${days}`, { cache: "no-store" });
    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError({ message: result.error || "Could not load the team.", plan: response.status === 402 });
      return;
    }

    setError(null);
    setReps(result.reps);
    setFunnel(result.funnel);
    setCanEditGoals(result.canEditGoals);
  }, [days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function setGoal(rep: Rep) {
    const value = window.prompt(`Monthly revenue goal for ${rep.name} (USD)`, rep.goal ? String(rep.goal) : "");
    if (value === null) return;

    await fetch("/api/team/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: rep.userId, goal: value === "" ? null : Number(value) }),
    });

    void load();
  }

  const totals = reps.reduce(
    (sum, rep) => ({
      emails: sum.emails + rep.emails,
      replies: sum.replies + rep.replies,
      meetings: sum.meetings + rep.meetings,
      proposals: sum.proposals + rep.proposals,
      wonValue: sum.wonValue + rep.wonValue,
    }),
    { emails: 0, replies: 0, meetings: 0, proposals: 0, wonValue: 0 }
  );

  const maxFunnel = Math.max(1, ...funnel.map((item) => item.count));

  if (error?.plan) {
    return (
      <main className="min-h-screen bg-[#050505] px-4 pt-6 text-white sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold">Team Performance</h1>
        <div className="mt-6 max-w-xl">
          <PlanGate feature="advanced_reports" title="Team performance is a Pro feature" description="See each rep's activity, conversion, revenue and goals in one place.">
            {null}
          </PlanGate>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 pb-28 pt-6 text-white sm:px-6 lg:px-8 lg:pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Team Performance</h1>
          <p className="mt-1 text-sm text-gray-500">Activity, conversion and revenue for every rep.</p>
        </div>

        <div className="flex gap-1 rounded-xl border border-[#202020] bg-[#0D0D0D] p-1">
          {[7, 30, 90].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDays(value)}
              className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
                days === value ? "bg-[#3B82F6] text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {value} days
            </button>
          ))}
        </div>
      </div>

      {error && !error.plan && (
        <p className="mt-6 rounded-2xl border border-[#F22F46]/30 bg-[#F22F46]/10 p-4 text-sm text-[#F22F46]">{error.message}</p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "Emails sent", value: totals.emails, icon: Mail, color: "#3B82F6" },
          { label: "Replies", value: totals.replies, icon: MessageSquareReply, color: "#2DD4BF" },
          { label: "Meetings", value: totals.meetings, icon: Video, color: "#F22F46" },
          { label: "Proposals", value: totals.proposals, icon: FileSignature, color: "#A78BFA" },
          { label: "Revenue won", value: formatMoney(totals.wonValue), icon: Trophy, color: "#84CC16" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bl-card rounded-2xl border border-[#202020] bg-[#0D0D0D] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-gray-500">{label}</span>
              <span className="bl-icon-tile" style={{ "--tab": color } as CSSProperties}>
                <Icon size={16} strokeWidth={2.2} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{loading ? "–" : value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Leaderboard */}
        <section className="min-w-0 rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
          <div className="flex items-center gap-3">
            <span className="bl-icon-tile" style={{ "--tab": "#F5C518" } as CSSProperties}>
              <Medal size={17} strokeWidth={2.2} />
            </span>
            <h2 className="text-base font-semibold">Leaderboard</h2>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="pb-3 font-medium">Rep</th>
                  <th className="pb-3 text-right font-medium">Leads</th>
                  <th className="pb-3 text-right font-medium">Emails</th>
                  <th className="pb-3 text-right font-medium">Reply rate</th>
                  <th className="pb-3 text-right font-medium">Meetings</th>
                  <th className="pb-3 text-right font-medium">Won</th>
                  <th className="pb-3 pl-4 font-medium">Monthly goal</th>
                </tr>
              </thead>
              <tbody>
                {reps.map((rep, index) => {
                  const replyRate = rep.emails ? Math.round((rep.replies / rep.emails) * 100) : 0;
                  const progress = rep.goal ? Math.min(100, (rep.monthWonValue / rep.goal) * 100) : 0;

                  return (
                    <tr key={rep.userId} className="border-t border-white/[0.06]">
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 && rep.wonValue > 0 ? "bg-[#3B82F6] text-white" : "bg-white/[0.06] text-gray-300"}`}>
                            {index === 0 && rep.wonValue > 0 ? <Crown size={14} /> : rep.name.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{rep.name}</p>
                            <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
                              {rep.role}
                              {rep.overdueTasks > 0 && (
                                <span className="inline-flex items-center gap-1 text-[#F22F46]">
                                  <AlertTriangle size={10} /> {rep.overdueTasks} overdue
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right tabular-nums text-gray-300">{rep.leads}</td>
                      <td className="text-right tabular-nums text-gray-300">{rep.emails}</td>
                      <td className="text-right tabular-nums text-[#2DD4BF]">{replyRate}%</td>
                      <td className="text-right tabular-nums text-gray-300">{rep.meetings}</td>
                      <td className="text-right tabular-nums">
                        <span className="text-[#84CC16]">{formatMoney(rep.wonValue)}</span>
                        <span className="ml-1 text-[11px] text-gray-500">({rep.wonDeals})</span>
                      </td>
                      <td className="pl-4">
                        <button
                          type="button"
                          disabled={!canEditGoals}
                          onClick={() => void setGoal(rep)}
                          className="w-full min-w-[150px] text-left disabled:cursor-default"
                        >
                          {rep.goal ? (
                            <>
                              <div className="flex justify-between text-[11px] text-gray-500">
                                <span>{formatMoney(rep.monthWonValue)}</span>
                                <span>{formatMoney(rep.goal)}</span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#191919]">
                                <div className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#84CC16]" style={{ width: `${progress}%` }} />
                              </div>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                              <Target size={12} /> {canEditGoals ? "Set goal" : "No goal"}
                            </span>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Funnel */}
        <section className="min-w-0 rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
          <div className="flex items-center gap-3">
            <span className="bl-icon-tile" style={{ "--tab": "#F472B6" } as CSSProperties}>
              <Filter size={17} strokeWidth={2.2} />
            </span>
            <h2 className="text-base font-semibold">Pipeline funnel</h2>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">Where every lead in the workspace is right now.</p>

          <div className="mt-5 space-y-3">
            {funnel.map((item) => (
              <div key={item.stage}>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300">{STAGE_LABEL[item.stage]}</span>
                  <span className="tabular-nums text-gray-500">{item.count}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#191919]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(item.count / maxFunnel) * 100}%`, background: STAGE_COLOR[item.stage] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
