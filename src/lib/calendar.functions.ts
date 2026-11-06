import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { supabase as browserSupabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const attachAuthHeader = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await browserSupabase.auth.getSession();
  const token = data.session?.access_token;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});

const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error || !data) throw new Error("Admin only");
    return next({ context });
  });

const InputSchema = z.object({ booking_id: z.string().uuid() });

/**
 * Generates a free Google Calendar direct event URL.
 * Requires 0 API keys, 0 billing, and 0 proxy servers.
 */
function createGoogleCalendarUrl(opts: {
  title: string;
  startDate: Date;
  endDate: Date;
  details: string;
  location?: string | null;
}): string {
  const formatTime = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${formatTime(opts.startDate)}/${formatTime(opts.endDate)}`,
    details: opts.details,
    ...(opts.location ? { location: opts.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export const confirmBookingAndAddToCalendar = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireAdmin])
  .inputValidator((d) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (bErr || !booking) throw new Error("Booking not found");

    if (!booking.event_date) {
      return { ok: false, calendar_added: false, reason: "Set an event date before confirming." };
    }

    // Confirm agreement and update status in database
    await supabaseAdmin
      .from("bookings")
      .update({ agreement_confirmed: true, status: "confirmed" })
      .eq("id", booking.id);

    try {
      const time = (booking.event_time as string | null) ?? "10:00:00";
      const startLocal = `${booking.event_date}T${time.length === 5 ? time + ":00" : time}`;
      const startDate = new Date(`${startLocal}+03:00`); // Africa/Nairobi
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const description =
        `Client: ${booking.full_name}\n` +
        `Email: ${booking.email}\n` +
        `Phone: ${booking.phone}\n` +
        `Service: ${booking.service}\n\n` +
        `Brief from client:\n${booking.description ?? ""}\n\n` +
        (booking.internal_notes ? `Admin notes:\n${booking.internal_notes}\n` : "");

      const calendarUrl = createGoogleCalendarUrl({
        title: `${booking.service} — ${booking.full_name}`,
        startDate,
        endDate,
        details: description,
        location: booking.venue,
      });

      return {
        ok: true,
        calendar_added: true,
        htmlLink: calendarUrl,
        reason: "Booking confirmed and calendar link generated.",
      };
    } catch (e) {
      console.error("Calendar link generation failed:", e);
      return {
        ok: true,
        calendar_added: false,
        reason: "Booking is confirmed in database.",
      };
    }
  });
