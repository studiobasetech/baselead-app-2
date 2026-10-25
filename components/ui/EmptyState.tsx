import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/*
 * Designed empty state: a small illustration, one line with the benefit,
 * and one clear next step. Used on every page when there's nothing yet.
 */

type Action = { label: string; href?: string; onClick?: () => void };

export default function EmptyState({
  icon: Icon,
  color = "#3B82F6",
  accents = ["#F5C518", "#A78BFA"],
  title,
  text,
  action,
  secondary,
  compact = false,
  children,
}: {
  icon: LucideIcon;
  color?: string;
  accents?: [string, string] | string[];
  title: string;
  text: string;
  action?: Action;
  secondary?: Action;
  compact?: boolean;
  children?: ReactNode;
}) {
  const button = (item: Action, primary: boolean) => {
    const className = primary
      ? "inline-flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2F74E8]"
      : "inline-flex items-center justify-center gap-2 rounded-xl border border-[#202020] px-5 py-2.5 text-sm text-gray-300 transition hover:border-[#2A2A2A] hover:text-white";
    return item.href ? (
      <Link href={item.href} className={className}>
        {item.label}
      </Link>
    ) : (
      <button type="button" onClick={item.onClick} className={className}>
        {item.label}
      </button>
    );
  };

  return (
    <div className={`bl-empty flex flex-col items-center text-center ${compact ? "px-4 py-8" : "px-6 py-14"}`}>
      <div className="relative h-24 w-28" aria-hidden>
        <span className="absolute inset-0 m-auto h-20 w-20 rounded-full border border-dashed" style={{ borderColor: `color-mix(in srgb, ${color} 35%, transparent)` }} />
        <span className="bl-icon-tile absolute left-0 top-2 !h-8 !w-8 -rotate-12 !rounded-lg opacity-80" style={{ "--tab": accents[0] } as CSSProperties} />
        <span className="bl-icon-tile absolute bottom-1 right-0 !h-7 !w-7 rotate-12 !rounded-lg opacity-80" style={{ "--tab": accents[1] } as CSSProperties} />
        <span className="bl-icon-tile absolute inset-0 m-auto !h-12 !w-12 !rounded-2xl" style={{ "--tab": color } as CSSProperties}>
          <Icon size={22} strokeWidth={2} />
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-gray-500">{text}</p>
      {(action || secondary) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action && button(action, true)}
          {secondary && button(secondary, false)}
        </div>
      )}
      {children}
    </div>
  );
}
