import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { ContactLine, LEGAL, Section } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          These terms are an agreement between you (and the company you represent) and {LEGAL.company}, which operates{" "}
          {LEGAL.product}. By creating an account or using {LEGAL.product}, you agree to them. If you use {LEGAL.product} for a
          company, you confirm you are authorized to accept these terms for it.
        </p>
      }
    >
      <Section title="1. The service">
        <p>
          {LEGAL.product} helps business-to-business sales teams find companies, contact them by email, text and phone, follow
          up automatically, book meetings, send proposals and manage a sales pipeline. Some features depend on third-party
          services you connect (such as Google, Twilio or Stripe) and on their availability.
        </p>
      </Section>

      <Section title="2. Accounts">
        <ul>
          <li>You must be at least 18 and give accurate information.</li>
          <li>You are responsible for your account, your team members’ use of the workspace, and keeping passwords safe. Tell us immediately about any unauthorized use.</li>
          <li>Workspace owners control who joins the workspace and what roles they have.</li>
        </ul>
      </Section>

      <Section title="3. Trial, plans and billing">
        <ul>
          <li>New workspaces can start a 7-day free trial with the limits of the Starter plan. When the trial ends, choose a paid plan to keep using {LEGAL.product}.</li>
          <li>Paid plans (Starter, Pro and Scale) are billed monthly or yearly in advance through Stripe and renew automatically until cancelled. Each plan’s features and limits are shown on the plan page in the app.</li>
          <li>You can cancel at any time from Settings → Billing; cancellation takes effect at the end of the current billing period. Except where required by law, payments are non-refundable.</li>
          <li>We may change prices with at least 30 days’ notice; changes apply from your next renewal.</li>
          <li>Promotional or discount codes are subject to the conditions shown when they are offered and may be withdrawn at any time.</li>
        </ul>
      </Section>

      <Section title="4. Acceptable use">
        <p>You agree to use {LEGAL.product} lawfully and responsibly. In particular, you will not:</p>
        <ul>
          <li>Send spam, misleading messages, or messages that violate anti-spam, telemarketing or privacy laws, including CAN-SPAM, the TCPA, CASL and GDPR.</li>
          <li>Send text messages or make automated calls to people without the consent those laws require, or ignore opt-out requests.</li>
          <li>Remove or hide the unsubscribe link or your business address from outreach emails.</li>
          <li>Contact consumers for personal, family or household purposes; {LEGAL.product} is for business-to-business outreach.</li>
          <li>Upload unlawful, harmful or infringing content, or personal data you have no right to use.</li>
          <li>Scrape, resell or redistribute data obtained through {LEGAL.product}, or use it to build a competing database.</li>
          <li>Attempt to break, overload, reverse engineer or gain unauthorized access to the service or other workspaces.</li>
        </ul>
        <p>You are responsible for the content you send and for obtaining any consent required to contact your leads. We may suspend accounts that put the service, its email or phone reputation, or other users at risk.</p>
      </Section>

      <Section title="5. Third-party data and services">
        <ul>
          <li>Business information comes from third parties such as Google Maps Platform and public websites. We do not guarantee it is accurate, complete or current; please verify it before relying on it.</li>
          <li>Your use of Google Maps features is also subject to the <a className="text-[#3B82F6] hover:underline" href="https://maps.google.com/help/terms_maps/" target="_blank" rel="noopener noreferrer">Google Maps/Google Earth Additional Terms of Service</a> and the <a className="text-[#3B82F6] hover:underline" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>.</li>
          <li>Connected services (Google, Twilio, Stripe, Hunter and others) are governed by their own terms, and their fees, if any, are your responsibility.</li>
        </ul>
      </Section>

      <Section title="6. AI features">
        <p>
          AI-generated drafts, scores and suggestions may be inaccurate. Review them before sending or acting on them. You are
          responsible for the messages you send.
        </p>
      </Section>

      <Section title="7. Your data">
        <p>
          You own the data you put into {LEGAL.product}. You give us permission to host, process and transmit it only as needed
          to provide and improve the service, as described in our <Link href="/privacy" className="text-[#3B82F6] hover:underline">Privacy Policy</Link>.
          You can export your leads (CSV) and delete your data at any time.
        </p>
      </Section>

      <Section title="8. Our property">
        <p>
          {LEGAL.product}, its software, design and brand belong to {LEGAL.company}. We give you a limited, non-exclusive,
          non-transferable right to use the service during your subscription. Feedback you share may be used to improve the
          product without obligation to you.
        </p>
      </Section>

      <Section title="9. Availability and changes">
        <p>
          We work to keep {LEGAL.product} available and secure but do not guarantee it will be uninterrupted or error-free. We may
          add, change or remove features; if a change materially reduces a paid feature, we will give reasonable notice.
        </p>
      </Section>

      <Section title="10. Termination">
        <p>
          You can stop using {LEGAL.product} and delete your account at any time. We may suspend or end access if you breach these
          terms or do not pay. On termination, your right to use the service ends and we will delete your data as described in
          the Privacy Policy.
        </p>
      </Section>

      <Section title="11. Disclaimers and limitation of liability">
        <p>
          To the fullest extent permitted by law, {LEGAL.product} is provided “as is” without warranties of any kind, and{" "}
          {LEGAL.company} is not liable for indirect, incidental, special or consequential damages, lost profits, lost sales or
          lost data. Our total liability for any claim is limited to the amount you paid us in the 12 months before the claim.
        </p>
      </Section>

      <Section title="12. Indemnity">
        <p>
          You agree to defend and indemnify {LEGAL.company} against claims arising from your content, your messages to leads, or
          your violation of these terms or the law.
        </p>
      </Section>

      <Section title="13. General">
        <p>
          These terms are governed by the laws of the State of {LEGAL.state}, USA, without regard to conflict-of-law rules, and disputes
          will be resolved in the courts located there unless the law where you live requires otherwise. If any part of these
          terms is unenforceable, the rest remains in effect. We may update these terms; we will notify you of material changes
          before they take effect.
        </p>
      </Section>

      <Section title="14. Contact">
        <p>Questions about these terms: <ContactLine />.</p>
      </Section>
    </LegalPage>
  );
}
