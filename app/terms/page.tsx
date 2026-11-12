import type { Metadata } from "next";
import LegalDoc from "@/components/legal/LegalDoc";

export const metadata: Metadata = { title: "Terms and Conditions" };

export default function TermsPage() {
  return <LegalDoc doc="terms" />;
}
