// Server-only helpers for review notifications.
// Uses independent email dispatcher — zero Lovable gateway dependencies.

import { sendNotificationEmail, getAdminNotificationEmail } from "@/lib/email.server";

const getSiteUrl = () => process.env.APP_URL || "https://gatei-portfolio.netlify.app";

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function shell(body: string) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#fff;color:#111;padding:24px;max-width:600px;margin:0 auto">${body}
<p style="color:#999;font-size:11px;margin-top:32px">GATEI · automated message</p></body></html>`;
}

export async function sendEditLinkEmail(opts: {
  to: string;
  name: string;
  token: string;
  firstTime: boolean;
}) {
  const url = `${getSiteUrl()}/reviews/edit?token=${encodeURIComponent(opts.token)}`;
  const intro = opts.firstTime
    ? "Thank you for your review — it has been received."
    : "Here is the secure link to edit your review.";

  const html =
    shell(`<h2 style="font-family:Georgia,serif;font-weight:normal">Hi ${escapeHtml(opts.name)},</h2>
<p style="font-size:14px;line-height:1.6">${intro}</p>
<p style="font-size:14px;line-height:1.6">You can make <strong>one</strong> edit to your review using the secure link below. The link expires in 7 days.</p>
<p style="margin:28px 0"><a href="${url}" style="background:#111;color:#fff;text-decoration:none;padding:14px 22px;border-radius:4px;font-size:13px;letter-spacing:.06em;text-transform:uppercase">Edit my review</a></p>
<p style="font-size:12px;color:#666;word-break:break-all">${url}</p>`);

  return sendNotificationEmail({
    to: opts.to,
    subject: opts.firstTime ? "Thank you for your review — GATEI" : "Edit your GATEI review",
    html,
  });
}

export async function sendAdminNewReviewEmail(opts: {
  name: string;
  email: string;
  rating: number;
  text: string;
}) {
  const adminEmail = getAdminNotificationEmail();

  const html =
    shell(`<h2 style="font-family:Georgia,serif;font-weight:normal">New review awaiting moderation</h2>
<table style="width:100%;font-size:14px;border-collapse:collapse">
<tr><td style="color:#666;padding:6px 0;width:100px">Name</td><td><strong>${escapeHtml(opts.name)}</strong></td></tr>
<tr><td style="color:#666;padding:6px 0">Email</td><td>${escapeHtml(opts.email)}</td></tr>
<tr><td style="color:#666;padding:6px 0">Rating</td><td>${opts.rating} / 5</td></tr>
</table>
<div style="margin-top:18px;padding:16px;background:#f6f6f6;border-radius:6px;white-space:pre-wrap;font-size:14px">${escapeHtml(opts.text)}</div>
<p style="margin:28px 0;font-size:13px;color:#666">You can view and approve this review in the <strong>Reviews</strong> tab of your Admin Dashboard.</p>`);

  return sendNotificationEmail({
    to: adminEmail,
    replyTo: opts.email,
    subject: `⭐ New review from ${opts.name} (${opts.rating}★)`,
    html,
  });
}
