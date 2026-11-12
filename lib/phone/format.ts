/** (713) 555-0123 for a +1 number; otherwise the number as given. */
export function formatCallerForPush(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return ten.length === 10 ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : value || "an unknown number";
}
