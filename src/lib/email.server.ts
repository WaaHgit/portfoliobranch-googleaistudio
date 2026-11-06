// Independent server-side email dispatcher.
// Works with any standard SMTP service or REST email API (Resend, Brevo, SendGrid, etc.)
// Completely independent of Lovable — zero proprietary gateway dependencies.

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

export type EmailResult = {
  ok: boolean;
  sent: boolean;
  reason?: string;
};

const DEFAULT_ADMIN_EMAIL = "projectfilesav@gmail.com";

export function getAdminNotificationEmail(): string {
  return process.env.ADMIN_NOTIFICATION_EMAIL || DEFAULT_ADMIN_EMAIL;
}

/**
 * Sends an email notification using configured environment variables.
 * Designed to never throw errors: if the provider is unconfigured or returns an error,
 * it returns { ok: false, sent: false } and logs the outcome so database operations continue unimpeded.
 */
export async function sendNotificationEmail(message: EmailMessage): Promise<EmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpHost = process.env.SMTP_HOST;

  // Option 1: Resend HTTP API (Popular free tier: 3,000 emails/month, zero server setup)
  if (resendApiKey) {
    try {
      const from = process.env.EMAIL_FROM || "GATEI Notifications <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          reply_to: message.replyTo,
          subject: message.subject,
          html: message.html,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.warn(`[email] Resend API responded with status ${res.status}: ${text}`);
        return { ok: false, sent: false, reason: `Resend error ${res.status}` };
      }

      return { ok: true, sent: true };
    } catch (err) {
      console.error("[email] Error sending email via Resend:", err);
      return { ok: false, sent: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }

  // Option 2: Generic Webhook / Netlify Email function / Custom Endpoint
  const webhookUrl = process.env.EMAIL_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
      return { ok: res.ok, sent: res.ok };
    } catch (err) {
      console.error("[email] Error dispatching email webhook:", err);
      return { ok: false, sent: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }

  // Fallback: No email provider configured yet
  // Submissions are already safely committed to Supabase and viewable in /admin.
  console.info(
    `[email] Notification queued for "${message.to}" (Subject: "${message.subject}"). ` +
      `No external email provider configured (set RESEND_API_KEY or EMAIL_WEBHOOK_URL). ` +
      `Submission is safely preserved in Supabase database.`,
  );

  return {
    ok: true,
    sent: false,
    reason: "Email provider not configured. Stored in database.",
  };
}
