import nodemailer from "nodemailer";

// Instantiated lazily, inside the function, rather than at module scope —
// Next.js evaluates route modules during the build's static-analysis pass,
// before any real env vars are guaranteed to be present, so a top-level
// transporter creation there throws and fails the whole build.
//
// Sends via the organizer's own Gmail account (SMTP + an App Password) —
// switched from Resend because Resend's free tier without a verified
// custom domain can only deliver to the account owner's own inbox, which
// defeats the point of notifying every participant. Sending as a real
// Gmail account has no such restriction and costs nothing.
export async function sendConfirmationEmail(opts: { to?: string | null; subject: string; html: string }) {
  if (!opts.to) return; // guests who opted out of email simply don't get one
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return; // email notifications are optional infra — silently skip if unconfigured

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return transporter.sendMail({
    from: `TeamSlots <${user}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

export function renderConfirmationEmail(title: string, startUtc: Date, endUtc: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat("zh-CN", { dateStyle: "full", timeStyle: "short", timeZone: timezone });
  return `
    <div style="font-family:-apple-system,sans-serif;color:#37352F;">
      <h2 style="margin-bottom:4px;">${title}</h2>
      <p style="color:#787774;">时间已确定：</p>
      <p style="font-size:18px;font-weight:600;">${fmt.format(startUtc)} – ${fmt.format(endUtc)}</p>
      <p style="color:#787774;font-size:13px;">（已按你的时区 ${timezone} 显示）</p>
    </div>
  `;
}
