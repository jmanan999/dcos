import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — JanSetu",
  description: "Privacy Policy for JanSetu Delhi Grievance Portal",
};

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">JanSetu — Delhi Grievance Portal</p>
        </div>
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        Last updated: June 2026 &nbsp;|&nbsp; Effective immediately
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-foreground">

        <section>
          <h2 className="mb-3 text-lg font-semibold">1. About JanSetu</h2>
          <p className="text-muted-foreground">
            JanSetu (जनसेतु) is a civic grievance management platform operated by the
            Government of the National Capital Territory of Delhi. It allows citizens to
            file, track, and resolve civic complaints across 12 departments including MCD,
            DJB, PWD, Delhi Police, DTC, and others.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">2. Information We Collect</h2>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li><strong className="text-foreground">Complaint content:</strong> Text descriptions, photos, videos, and voice notes you submit.</li>
            <li><strong className="text-foreground">Location data:</strong> GPS coordinates or map pins you voluntarily provide to help route your complaint to the correct ward/department.</li>
            <li><strong className="text-foreground">Contact information:</strong> Mobile number or email address, only if you choose to provide it for status updates.</li>
            <li><strong className="text-foreground">WhatsApp messages:</strong> If you contact us via WhatsApp, we collect the message content and your WhatsApp number to process your complaint.</li>
            <li><strong className="text-foreground">Device/usage data:</strong> Browser type, approximate location (city level), and interaction logs for service improvement.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">3. How We Use Your Information</h2>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>To file and route your complaint to the appropriate government department and officer.</li>
            <li>To send you status updates via SMS, WhatsApp, or web notifications (only if you opt in).</li>
            <li>To generate anonymized analytics for the Chief Minister&apos;s dashboard and public transparency reporting.</li>
            <li>To detect and prevent spam, fraud, and misuse of the platform.</li>
            <li>To improve AI classification accuracy (your complaints help train the routing system).</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">4. Data Sharing</h2>
          <p className="mb-2 text-muted-foreground">
            We share your information only as necessary:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li><strong className="text-foreground">Government officers:</strong> Your complaint details are shared with the assigned department officer for resolution.</li>
            <li><strong className="text-foreground">Public transparency:</strong> Anonymized, aggregated data (complaint counts, resolution rates, ward-level heatmaps) is published publicly. No personal information is included.</li>
            <li><strong className="text-foreground">AI providers:</strong> Complaint text is processed by AI services (Groq) for classification. We do not share personally identifiable information with AI providers.</li>
            <li>We do <strong className="text-foreground">not</strong> sell your data to third parties.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">5. WhatsApp Integration</h2>
          <p className="text-muted-foreground">
            If you interact with JanSetu via WhatsApp, your messages are received via the
            Meta WhatsApp Cloud API and processed to create a grievance record. Your
            WhatsApp number is used solely to file your complaint and send you the tracking
            ID and status updates. We do not store or share your WhatsApp number beyond
            this purpose. You may opt out of WhatsApp notifications at any time by
            replying &quot;STOP&quot;.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">6. Data Retention</h2>
          <p className="text-muted-foreground">
            Grievance records are retained for 5 years in accordance with government
            record-keeping requirements. Contact information (mobile number / email) is
            retained only as long as your account is active. You may request deletion of
            your personal information at any time (see Section 8).
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">7. Data Security</h2>
          <p className="text-muted-foreground">
            All data is encrypted in transit (TLS 1.3) and at rest. Access is restricted
            by role-based controls — a field officer can only see complaints assigned to
            their department. Database-level Row Level Security (RLS) is enforced. We are
            compliant with applicable Indian data protection standards.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">8. Your Rights (DPDP Act 2023)</h2>
          <p className="mb-2 text-muted-foreground">
            Under the Digital Personal Data Protection Act 2023, you have the right to:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Access personal data we hold about you.</li>
            <li>Correct inaccurate personal data.</li>
            <li>Request erasure of your personal data (subject to legal retention requirements).</li>
            <li>Withdraw consent for notifications at any time.</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            To exercise these rights, contact us at: <strong className="text-foreground">grievance@delhi.gov.in</strong>
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">9. Cookies</h2>
          <p className="text-muted-foreground">
            We use only essential cookies for session management and user preference
            storage (e.g., language selection). No tracking or advertising cookies are used.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">10. Contact</h2>
          <p className="text-muted-foreground">
            Government of NCT of Delhi<br />
            Delhi Secretariat, I.P. Estate, New Delhi - 110 002<br />
            Email: <strong className="text-foreground">grievance@delhi.gov.in</strong><br />
            Helpline: <strong className="text-foreground">1031</strong>
          </p>
        </section>

        <section className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">
            This privacy policy applies to the JanSetu web portal (
            <Link href="https://dcos-ecru.vercel.app" className="text-primary underline">
              dcos-ecru.vercel.app
            </Link>
            ) and the JanSetu WhatsApp service. For complaints about privacy practices,
            you may also contact the Ministry of Electronics and Information Technology
            (MeitY) or the Data Protection Board of India once constituted under the
            DPDP Act 2023.
          </p>
        </section>
      </div>
    </div>
  );
}
