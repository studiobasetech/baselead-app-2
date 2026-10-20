import type { Metadata } from "next";
import LegalPage, { ContactLine, LEGAL, Section } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          This policy explains what information {LEGAL.product} (“we”, “us”), operated by {LEGAL.company}, collects, how we use
          it, and the choices you have. {LEGAL.product} is a business-to-business sales tool: it helps sales teams find
          businesses, contact them and manage their pipeline.
        </p>
      }
    >
      <Section title="1. Information we collect">
        <ul>
          <li><strong>Account information:</strong> your name, email address, password (stored hashed by our authentication provider), language and notification preferences, and two-factor authentication settings.</li>
          <li><strong>Workspace information:</strong> your company profile (name, logo, address, services, ideal customer), team members and their roles, goals and settings.</li>
          <li><strong>Sales data you create or import:</strong> leads, contacts, notes, tasks, pipeline stages, deal values, email templates, sequences, proposals, signatures, meetings and activity history.</li>
          <li><strong>Business data from public sources:</strong> when you search, we retrieve publicly listed business information (such as name, address, phone, website, rating) from Google Maps Platform or OpenStreetMap, and from the business’s public website. With Hunter.io connected, we may retrieve publicly available professional contact details for people at those businesses.</li>
          <li><strong>Connected services:</strong> if you connect Google, Twilio or Stripe, we receive the data described in sections 3 and 4.</li>
          <li><strong>Billing information:</strong> payments are processed by Stripe. We receive your plan, billing status and limited payment details (for example card brand and last four digits) but never your full card number.</li>
          <li><strong>Technical information:</strong> basic logs (IP address, browser type, timestamps, errors) needed to run and secure the service. We do not use advertising trackers inside the app.</li>
        </ul>
      </Section>

      <Section title="2. How we use information">
        <ul>
          <li>To provide the service: finding and scoring leads, sending the emails and messages you ask us to send, detecting replies, booking meetings, generating proposals and keeping your pipeline up to date.</li>
          <li>To send you account emails and the notifications you turn on (new replies, bookings, reminders, weekly report).</li>
          <li>To process subscriptions and prevent fraud and abuse.</li>
          <li>To provide support, keep the service secure and fix problems.</li>
          <li>To generate AI suggestions (email drafts, lead analysis) when you use those features. See section 5.</li>
        </ul>
        <p>We do not sell your personal information, and we do not use your data or your leads’ data to advertise to them.</p>
      </Section>

      <Section title="3. Google user data">
        <p>If you connect your Google account, {LEGAL.product} requests only the permissions needed for the features you use:</p>
        <ul>
          <li><strong>Gmail:</strong> to send emails you write or approve from your own Gmail account (send-only access). {LEGAL.product} does not read your inbox. To know when a lead replies, outreach emails include a reply-tracking address alongside your own, so a copy of the lead’s reply to that email is delivered to {LEGAL.product}.</li>
          <li><strong>Google Calendar:</strong> to check when you are free so leads can book a time, and to create meetings (with Google Meet links) that you or your leads schedule.</li>
          <li><strong>Google Sheets:</strong> only if you choose to export data to a spreadsheet.</li>
        </ul>
        <p>
          We store your Google connection token encrypted, and we store only the information needed for these features
          (for example the message and thread IDs of emails sent from {LEGAL.product}, a short snippet of a reply, and
          meeting times). You can disconnect Google at any time in Integrations or in your Google account settings.
        </p>
        <p>
          <strong>
            {LEGAL.product}’s use and transfer to any other app of information received from Google APIs will adhere to the{" "}
            <a className="text-[#3B82F6] hover:underline" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </strong>{" "}
          We do not use Google user data for advertising, we do not sell it, we do not allow humans to read it except with your
          permission, for security, or as required by law, and we do not use it to train general-purpose AI models.
        </p>
      </Section>

      <Section title="4. Other connected services">
        <ul>
          <li><strong>Twilio:</strong> if your workspace connects Twilio, text messages and call information you send or receive through {LEGAL.product} are processed by Twilio and stored on the lead’s timeline.</li>
          <li><strong>Stripe:</strong> if you collect payments for proposals, your clients pay through Stripe. We store the payment status and amount, not card details.</li>
          <li><strong>Webhooks and API:</strong> if you set up webhooks or API keys, the data you choose is sent to the destinations you configure.</li>
        </ul>
      </Section>

      <Section title="5. AI features">
        <p>
          When you use AI features, the relevant information (for example a lead’s public business details and your company
          profile) is sent to our AI provider, Anthropic, to generate the result. Under its commercial terms, the provider does
          not use this data to train its models. Always review AI-generated content before you send it.
        </p>
      </Section>

      <Section title="6. Service providers">
        <p>We share information only with providers that help us run {LEGAL.product}, under contracts that protect it:</p>
        <ul>
          <li>Supabase (database, authentication and storage)</li>
          <li>Vercel (hosting)</li>
          <li>Google (Maps Platform, Gmail, Calendar, Sheets)</li>
          <li>Anthropic (AI features)</li>
          <li>Stripe (payments)</li>
          <li>Twilio (text messages and calls, if connected)</li>
          <li>Hunter.io (contact lookup, if enabled)</li>
          <li>Resend (notification emails, if enabled)</li>
        </ul>
        <p>We may also disclose information if required by law, to protect our rights or users’ safety, or as part of a merger or acquisition, in which case this policy will continue to apply.</p>
      </Section>

      <Section title="7. Your leads and contacts">
        <p>
          When you add or find leads, your workspace is responsible for having a lawful basis to contact them and for following
          applicable laws (such as CAN-SPAM, TCPA and GDPR). Every outreach email sent through {LEGAL.product} includes an
          unsubscribe link, and people who unsubscribe or reply asking not to be contacted are automatically excluded from
          future emails. Anyone can ask us to remove their information by contacting us.
        </p>
      </Section>

      <Section title="8. Security">
        <p>
          We use encryption in transit (HTTPS), encrypted storage of connection tokens and secret keys, row-level access
          controls so each workspace only sees its own data, and optional two-factor authentication. No system is perfectly
          secure, so please use a strong password and enable two-factor authentication.
        </p>
      </Section>

      <Section title="9. Data retention and deletion">
        <p>
          We keep your data while your account is active. You can delete individual leads, all leads, or your entire account
          from Settings at any time. When you delete your account, we delete your workspace data within 30 days, except
          information we must keep for legal, tax or fraud-prevention reasons. Backups are overwritten on a rolling basis.
        </p>
      </Section>

      <Section title="10. Your rights">
        <p>
          Depending on where you live (for example California or the European Economic Area), you may have the right to access,
          correct, export or delete your personal information, and to object to or restrict certain processing. You can do most
          of this inside the app; for anything else, contact us and we will respond within the time required by law.
        </p>
      </Section>

      <Section title="11. Children">
        <p>{LEGAL.product} is a business tool and is not intended for anyone under 18. We do not knowingly collect information from children.</p>
      </Section>

      <Section title="12. International transfers">
        <p>We and our providers may process information in the United States and other countries. Where required, we rely on appropriate safeguards such as standard contractual clauses.</p>
      </Section>

      <Section title="13. Changes">
        <p>We may update this policy. If we make material changes, we will notify you in the app or by email before they take effect.</p>
      </Section>

      <Section title="14. Contact">
        <p>Questions or requests about privacy: <ContactLine />.</p>
      </Section>
    </LegalPage>
  );
}
