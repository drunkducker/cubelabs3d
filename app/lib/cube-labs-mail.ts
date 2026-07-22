export type CubeLabsMailTemplate = {
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderCubeLabsMail(template: CubeLabsMailTemplate) {
  const subject = escapeHtml(template.subject);
  const preheader = escapeHtml(template.preheader);
  const heading = escapeHtml(template.heading);
  const body = escapeHtml(template.body);
  const actionLabel = escapeHtml(template.actionLabel);
  const actionUrl = escapeHtml(template.actionUrl);

  return {
    subject: template.subject,
    text: `${template.heading}\n\n${template.body}\n\n${template.actionLabel}: ${template.actionUrl}\n\nCube Lab 3D`,
    html: `<!doctype html>
<html>
  <body style="margin:0;background:#070a12;color:#f5f7fb;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#070a12;padding:28px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;border:1px solid #263044;border-radius:24px;background:#101522;overflow:hidden;">
          <tr><td style="padding:28px 28px 12px;font-weight:900;font-size:20px;letter-spacing:.04em;">CUBE LAB <span style="color:#4d8dff;">3D</span></td></tr>
          <tr><td style="padding:18px 28px 8px;"><h1 style="margin:0;font-size:34px;line-height:1.08;">${heading}</h1></td></tr>
          <tr><td style="padding:14px 28px;color:#b8c2d3;font-size:16px;line-height:1.65;">${body}</td></tr>
          <tr><td style="padding:12px 28px 30px;"><a href="${actionUrl}" style="display:inline-block;background:#1768e5;color:white;text-decoration:none;font-weight:900;padding:14px 20px;border-radius:12px;">${actionLabel}</a></td></tr>
          <tr><td style="padding:20px 28px;border-top:1px solid #263044;color:#7f8ba0;font-size:12px;line-height:1.6;">Sent by Cube Labs Mail. Security links expire automatically. Never share your password or verification codes.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}

export const cubeLabsMailTemplates = {
  passwordReset(displayName: string, actionUrl: string) {
    return renderCubeLabsMail({
      subject: "Reset your Cube Labs password",
      preheader: "Choose a new password for your Cube ID.",
      heading: "Reset your password",
      body: `Hi ${displayName || "Cube Solver"}. Use the secure button below to choose a new password. If you did not request this, you can ignore this email.`,
      actionLabel: "Choose new password",
      actionUrl,
    });
  },
  welcome(displayName: string, actionUrl: string) {
    return renderCubeLabsMail({
      subject: `Welcome to Cube Labs, ${displayName || "Cube Solver"}`,
      preheader: "Your Cube ID is active.",
      heading: "Your Cube ID is ready",
      body: "Start solving, save your results, build your cube collection, unlock achievements, and challenge friends.",
      actionLabel: "Open Cube Labs",
      actionUrl,
    });
  },
};
