"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/*
 * In-app phone (Telnyx WebRTC). Calls run in the browser — reps use a headset.
 * The Telnyx library is served by /api/phone/sdk from node_modules.
 */

export type PhoneUsage = {
  repsWithNumbers: number;
  repsIncluded: number;
  minutesPerRep: number;
  packMinutes: number;
  allowance: number;
  used: number;
  remaining: number;
  myUsed: number;
  myLimit: number | null;
};

export type PhoneStatus = {
  allowed: boolean;
  configured: boolean;
  isManager: boolean;
  scorecards?: boolean;
  myNumber?: string | null;
  policyAccepted?: boolean;
  usage?: PhoneUsage;
  settings?: { non_lead_policy: "flag" | "block"; announcement: boolean };
};

export type PhoneState =
  | "loading"
  | "locked"          // Starter / trial
  | "not_configured"  // Telnyx keys not added yet
  | "no_number"
  | "policy"          // rep must accept the recording policy
  | "sdk_missing"     // npm install @telnyx/webrtc
  | "connecting"
  | "ready"
  | "error";

export type ActiveCall = {
  callId: string | null;
  direction: "outbound" | "inbound";
  number: string;
  leadId: string | null;
  leadName: string | null;
  stage: "dialing" | "ringing" | "active" | "ended";
  startedAt: number;
  answeredAt: number | null;
  muted: boolean;
};

export type EndedCall = {
  callId: string | null;
  direction: "outbound" | "inbound";
  number: string;
  leadName: string | null;
  seconds: number;
};

type TelnyxCall = {
  id: string;
  state: string;
  direction: "inbound" | "outbound";
  options?: { remoteCallerNumber?: string; remoteCallerName?: string; destinationNumber?: string };
  answer: () => void;
  hangup: () => void;
  muteAudio: () => void;
  unmuteAudio: () => void;
  dtmf: (digit: string) => void;
};

type TelnyxClient = {
  remoteElement?: string;
  on: (event: string, handler: (arg: unknown) => void) => void;
  connect: () => void;
  disconnect: () => void;
  newCall: (options: Record<string, unknown>) => TelnyxCall;
};

declare global {
  interface Window {
    TelnyxWebRTC?: { TelnyxRTC: new (options: Record<string, unknown>) => TelnyxClient };
    TelnyxRTC?: new (options: Record<string, unknown>) => TelnyxClient;
  }
}

type PhoneContextValue = {
  state: PhoneState;
  status: PhoneStatus | null;
  error: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  call: ActiveCall | null;
  incoming: { number: string; leadName: string | null } | null;
  ended: EndedCall | null;
  clearEnded: () => void;
  refresh: () => Promise<void>;
  acceptPolicy: () => Promise<void>;
  startCall: (number: string, options?: { leadId?: string | null; leadName?: string | null }) => Promise<boolean>;
  answer: () => void;
  decline: () => void;
  hangup: () => void;
  toggleMute: () => void;
  sendDigit: (digit: string) => void;
  canCallInApp: boolean;
};

const PhoneContext = createContext<PhoneContextValue | null>(null);
const AUDIO_ID = "bl-phone-remote-audio";

function loadSdk(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.TelnyxWebRTC || window.TelnyxRTC) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "/api/phone/sdk";
    script.async = true;
    script.onload = () => resolve(Boolean(window.TelnyxWebRTC || window.TelnyxRTC));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export function PhoneProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PhoneState>("loading");
  const [status, setStatus] = useState<PhoneStatus | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [incoming, setIncoming] = useState<{ number: string; leadName: string | null } | null>(null);
  const [ended, setEnded] = useState<EndedCall | null>(null);

  const clientRef = useRef<TelnyxClient | null>(null);
  const telnyxCallRef = useRef<TelnyxCall | null>(null);
  const callRef = useRef<ActiveCall | null>(null);
  const callerNumberRef = useRef<string>("");

  const updateCall = useCallback((next: ActiveCall | null) => {
    callRef.current = next;
    setCall(next);
  }, []);

  const finishCall = useCallback(() => {
    const current = callRef.current;
    telnyxCallRef.current = null;
    setIncoming(null);
    if (current) {
      const seconds = current.answeredAt ? Math.round((Date.now() - current.answeredAt) / 1000) : 0;
      setEnded({ callId: current.callId, direction: current.direction, number: current.number, leadName: current.leadName, seconds });
    }
    updateCall(null);
  }, [updateCall]);

  const onCallUpdate = useCallback(
    async (telnyxCall: TelnyxCall) => {
      const s = telnyxCall.state;

      if (telnyxCall.direction === "inbound" && s === "ringing" && !callRef.current) {
        telnyxCallRef.current = telnyxCall;
        const number = telnyxCall.options?.remoteCallerNumber || "Unknown";
        let leadName: string | null = null;
        try {
          const response = await fetch(`/api/phone/lookup?number=${encodeURIComponent(number)}`);
          const data = await response.json();
          leadName = data.lead ? data.lead.company || data.lead.name : null;
        } catch {
          // Show the number only.
        }
        setIncoming({ number, leadName });
        setOpen(true);
        updateCall({ callId: null, direction: "inbound", number, leadId: null, leadName, stage: "ringing", startedAt: Date.now(), answeredAt: null, muted: false });
        return;
      }

      const current = callRef.current;
      if (!current) return;

      if (s === "ringing" || s === "early") updateCall({ ...current, stage: "ringing" });
      if (s === "active" && current.stage !== "active") {
        setIncoming(null);
        updateCall({ ...current, stage: "active", answeredAt: Date.now() });
      }
      if (s === "hangup" || s === "destroy" || s === "purge") finishCall();
    },
    [finishCall, updateCall]
  );

  const connect = useCallback(async () => {
    if (clientRef.current) return;
    setState("connecting");

    const sdk = await loadSdk();
    if (!sdk) {
      setState("sdk_missing");
      return;
    }

    try {
      const response = await fetch("/api/phone/token", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.code === "POLICY") setState("policy");
        else if (data.code === "NO_NUMBER") setState("no_number");
        else if (data.code === "NOT_CONFIGURED") setState("not_configured");
        else {
          setError(data.error || "Could not start the phone.");
          setState("error");
        }
        return;
      }

      callerNumberRef.current = data.callerNumber;
      const Ctor = window.TelnyxWebRTC?.TelnyxRTC || window.TelnyxRTC;
      if (!Ctor) {
        setState("sdk_missing");
        return;
      }

      const client = new Ctor({ login_token: data.token });
      client.remoteElement = AUDIO_ID;
      client.on("telnyx.ready", () => setState("ready"));
      client.on("telnyx.error", () => {
        setError("The phone lost its connection. Reconnecting…");
        setState("error");
        clientRef.current = null;
        window.setTimeout(() => connect(), 5000);
      });
      client.on("telnyx.socket.close", () => {
        clientRef.current = null;
        setState("connecting");
        window.setTimeout(() => connect(), 3000);
      });
      client.on("telnyx.notification", (notification) => {
        const n = notification as { type?: string; call?: TelnyxCall };
        if (n.type === "callUpdate" && n.call) onCallUpdate(n.call);
      });
      clientRef.current = client;
      client.connect();
    } catch {
      setError("Could not start the phone.");
      setState("error");
    }
  }, [onCallUpdate]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/phone/status", { cache: "no-store" });
      if (!response.ok) {
        setState("locked");
        return;
      }
      const data = (await response.json()) as PhoneStatus;
      setStatus(data);
      if (!data.allowed) return setState("locked");
      if (!data.configured) return setState("not_configured");
      if (!data.myNumber) return setState("no_number");
      if (!data.policyAccepted) return setState("policy");
      // Dev-only demo (marketing screenshots): show the phone as connected without dialing out.
      const demo = (window as unknown as { __blDemoPhone?: { call?: Partial<ActiveCall> & { secondsIn?: number } } }).__blDemoPhone;
      if (demo && process.env.NODE_ENV !== "production") {
        setState("ready");
        if (demo.call) {
          const secondsIn = demo.call.secondsIn ?? 0;
          updateCall({
            callId: null, direction: "outbound", number: "", leadId: null, leadName: null, muted: false,
            ...demo.call, stage: demo.call.stage ?? "active",
            startedAt: Date.now() - secondsIn * 1000 - 9000, answeredAt: Date.now() - secondsIn * 1000,
          });
        }
        return;
      }
      if (!clientRef.current) await connect();
    } catch {
      setState("error");
    }
  }, [connect, updateCall]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const onRefresh = () => refresh();
    window.addEventListener("baselead-phone-refresh", onRefresh);
    return () => {
      window.removeEventListener("baselead-phone-refresh", onRefresh);
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, [refresh]);

  // Warn before leaving the page during a call.
  useEffect(() => {
    if (!call) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [call]);

  const acceptPolicy = useCallback(async () => {
    await fetch("/api/phone/policy", { method: "POST" });
    await refresh();
  }, [refresh]);

  const startCall = useCallback(
    async (number: string, options: { leadId?: string | null; leadName?: string | null } = {}) => {
      setError("");
      setOpen(true);
      if (callRef.current) {
        setError("Finish the current call first.");
        return false;
      }
      if (!clientRef.current || state !== "ready") {
        if (state === "loading" || state === "connecting") setError("The phone is still connecting. Try again in a moment.");
        return false;
      }

      const response = await fetch("/api/phone/calls/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: number, leadId: options.leadId ?? null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Could not place the call.");
        return false;
      }

      const leadName = options.leadName ?? (data.lead ? data.lead.company || data.lead.name : null);
      updateCall({
        callId: data.callId,
        direction: "outbound",
        number: data.to,
        leadId: data.lead?.id ?? options.leadId ?? null,
        leadName,
        stage: "dialing",
        startedAt: Date.now(),
        answeredAt: null,
        muted: false,
      });

      try {
        telnyxCallRef.current = clientRef.current.newCall({
          destinationNumber: data.to,
          callerNumber: data.callerNumber || callerNumberRef.current,
          clientState: btoa(JSON.stringify({ callId: data.callId })),
          audio: true,
          video: false,
        });
        return true;
      } catch {
        setError("Could not place the call. Check your microphone permission.");
        updateCall(null);
        return false;
      }
    },
    [state, updateCall]
  );

  const answer = useCallback(() => {
    telnyxCallRef.current?.answer();
    setIncoming(null);
  }, []);

  const decline = useCallback(() => {
    telnyxCallRef.current?.hangup();
    setIncoming(null);
    updateCall(null);
  }, [updateCall]);

  const hangup = useCallback(() => {
    if (telnyxCallRef.current) telnyxCallRef.current.hangup();
    else finishCall();
  }, [finishCall]);

  const toggleMute = useCallback(() => {
    const current = callRef.current;
    const telnyxCall = telnyxCallRef.current;
    if (!current || !telnyxCall) return;
    if (current.muted) telnyxCall.unmuteAudio();
    else telnyxCall.muteAudio();
    updateCall({ ...current, muted: !current.muted });
  }, [updateCall]);

  const sendDigit = useCallback((digit: string) => {
    telnyxCallRef.current?.dtmf(digit);
  }, []);

  return (
    <PhoneContext.Provider
      value={{
        state,
        status,
        error,
        open,
        setOpen,
        call,
        incoming,
        ended,
        clearEnded: () => setEnded(null),
        refresh,
        acceptPolicy,
        startCall,
        answer,
        decline,
        hangup,
        toggleMute,
        sendDigit,
        canCallInApp: state === "ready",
      }}
    >
      {children}
      <audio id={AUDIO_ID} autoPlay playsInline className="hidden" />
    </PhoneContext.Provider>
  );
}

export function usePhone() {
  return useContext(PhoneContext);
}
