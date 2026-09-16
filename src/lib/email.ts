import { Resend } from "resend";

// Instantiated lazily, inside the function, rather than at module scope.
// Next.js evaluates route modules during the build's static-analysis pass,
// before any real env vars are guaranteed to be present — a top-level
// `new Resend(...)` there throws and fails the whole build.
export async function sendConfirmationEmail(opts: { to?: string | null; subject: string; html: string }) {
  if (!opts.to) return; // guests who didn't leave an email simply don't get one in v1
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: process.env.EMAIL_FROM || "TeamSlots <notify@teamslots.app>",
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
