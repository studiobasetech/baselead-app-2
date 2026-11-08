"use client";

import type { ReactNode } from "react";
import { usePhone } from "@/components/phone/PhoneProvider";

type Props = {
  number: string;
  leadId?: string | null;
  leadName?: string | null;
  className?: string;
  children: ReactNode;
  title?: string;
};

/**
 * Calls a lead with the in-app phone (Pro/Scale). Without built-in calling
 * it stays a normal "call from my phone" link.
 */
export default function CallButton({ number, leadId, leadName, className, children, title }: Props) {
  const phone = usePhone();
  const inApp = phone && !["loading", "locked", "not_configured", "sdk_missing"].includes(phone.state);

  if (!inApp) {
    return (
      <a href={`tel:${number}`} className={className} title={title}>
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      title={title}
      onClick={() => {
        if (phone.state === "ready") phone.startCall(number, { leadId, leadName });
        else phone.setOpen(true);
      }}
    >
      {children}
    </button>
  );
}
