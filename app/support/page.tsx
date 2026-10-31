import type { Metadata } from "next";
import LegalPage, { ContactLine, LEGAL, Section } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  return (
    <LegalPage
      title="Support"
      intro={
        <p>
          Need help with {LEGAL.product}? Email us at <ContactLine /> and we will answer within one business day.
          Please include the email you use to sign in and, if possible, a screenshot.
        </p>
      }
    >
      <Section title="Getting started">
        <ul>
          <li><strong>Create your workspace:</strong> sign up, then add your services, ideal client and target cities in Settings → Company and AI & Services.</li>
          <li><strong>Connect Gmail and Google Calendar:</strong> Integrations → Gmail / Google Calendar. Emails are sent from your own inbox.</li>
          <li><strong>Find leads:</strong> tap New search, describe who you want to reach and pick the leads to save.</li>
          <li><strong>Follow up automatically:</strong> create a sequence in Sequences and add leads to it. It stops when a lead replies.</li>
        </ul>
      </Section>

      <Section title="Plans and billing">
        <ul>
          <li>Every plan starts with a 7-day free trial. You can change or cancel your plan anytime in Settings → Billing & Plan.</li>
          <li>Payments are processed securely by Stripe. We never see your full card number.</li>
        </ul>
      </Section>

      <Section title="Delete your account and data">
        <ul>
          <li><strong>In the app:</strong> Settings → My Profile → Delete Account. This permanently deletes your account, your workspace (if you are the owner) and its leads, emails, sequences and proposals.</li>
          <li><strong>Without the app:</strong> email <ContactLine /> from the address you sign in with and ask us to delete your account. We complete requests within 30 days.</li>
          <li>Billing records that we are legally required to keep (such as invoices) are retained for the period the law requires.</li>
        </ul>
      </Section>

      <Section title="Privacy and security">
        <p>
          Read how we handle your data in our <a href="/privacy" className="text-[#3B82F6] hover:underline">Privacy Policy</a> and
          the rules for using the service in our <a href="/terms" className="text-[#3B82F6] hover:underline">Terms of Service</a>.
          To report a security issue, email <ContactLine />.
        </p>
      </Section>
    </LegalPage>
  );
}
