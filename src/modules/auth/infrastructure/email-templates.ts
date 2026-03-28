export function buildPasswordResetEmailHtml(
	userName: string,
	resetUrl: string,
): string {
	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:48px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#fff;font-size:24px;margin:0;">Studio AI</h1>
    </div>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:32px;text-align:center;">
      <h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Reset your password</h2>
      <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Hey ${userName}, click the button below to reset your password. This link expires in 1 hour.
      </p>
      <a href="${resetUrl}"
         style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        Reset Password
      </a>
      <p style="color:#71717a;font-size:12px;margin-top:24px;">
        If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function buildVerificationEmailHtml(
	userName: string,
	verificationUrl: string,
): string {
	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:48px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#fff;font-size:24px;margin:0;">Studio AI</h1>
    </div>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:32px;text-align:center;">
      <h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Verify your email</h2>
      <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Hey ${userName}, click the button below to verify your email and unlock your studio.
      </p>
      <a href="${verificationUrl}"
         style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        Verify Email
      </a>
      <p style="color:#71717a;font-size:12px;margin-top:24px;">
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}
