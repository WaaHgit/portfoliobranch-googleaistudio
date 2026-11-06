// Server-only notification dispatcher for new booking inquiries.
// Independent implementation: sends email notifications directly to the administrator
// without Lovable gateways or third-party proxy restrictions.

import { sendNotificationEmail, getAdminNotificationEmail } from "@/lib/email.server";

export type BookingPayload = {
  id?: string | null;
  full_name: string;
  email: string;
  phone: string;
  service: string;
  description: string;
  preferred_date: string | null;
};

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export async function notifyBooking(b: BookingPayload) {
  const adminEmail = getAdminNotificationEmail();
  const replySubject = encodeURIComponent(`Re: Your GATEI booking — ${b.service}`);
  const replyBody = encodeURIComponent(
    `Hi ${b.full_name},\n\nThanks for reaching out to GATEI regarding "${b.service}".\n\n— GATEI\n\n----\nYour message:\n${b.description}`,
  );
  const replyLink = `mailto:${encodeURIComponent(b.email)}?subject=${replySubject}&body=${replyBody}`;
  const timestamp = new Date().toLocaleString("en-GB", { timeZone: "Africa/Nairobi" });

  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#fff;color:#111;padding:24px;max-width:640px;margin:0 auto">
<h2 style="margin:0 0 4px;font-family:Georgia,serif;font-weight:normal">New booking — ${escapeHtml(b.service)}</h2>
<p style="color:#666;margin:0 0 24px;font-size:13px">${timestamp}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
  <tr><td style="padding:6px 0;color:#666;width:120px">Name</td><td><strong>${escapeHtml(b.full_name)}</strong></td></tr>
  <tr><td style="padding:6px 0;color:#666">Email</td><td><a href="mailto:${escapeHtml(b.email)}">${escapeHtml(b.email)}</a></td></tr>
  <tr><td style="padding:6px 0;color:#666">Phone</td><td><a href="tel:${escapeHtml(b.phone)}">${escapeHtml(b.phone)}</a></td></tr>
  <tr><td style="padding:6px 0;color:#666">Pref. date</td><td>${escapeHtml(b.preferred_date ?? "—")}</td></tr>
</table>
<div style="margin-top:20px;padding:16px;background:#f6f6f6;border-radius:6px;white-space:pre-wrap;font-size:14px">${escapeHtml(b.description)}</div>
<div style="margin-top:28px;display:flex;gap:12px;flex-wrap:wrap">
  <a href="${replyLink}" style="background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;display:inline-block;font-size:13px;letter-spacing:.06em;text-transform:uppercase">Reply to client</a>
</div>
<p style="color:#999;font-size:11px;margin-top:32px">GATEI bookings · automated notification (view full details in your Admin Dashboard)</p>
</body></html>`;

  return sendNotificationEmail({
    to: adminEmail,
    replyTo: b.email,
    subject: `📌 New booking — ${b.full_name} (${b.service})`,
    html,
  });
}
