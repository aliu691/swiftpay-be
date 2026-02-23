export function passwordResetTemplate(params: { resetLink: string }) {
  const { resetLink } = params;

  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background:#f5f7fb; padding:40px;">
      <div style="max-width:600px; margin:auto; background:#fff; border-radius:8px; padding:32px;">
        
        <h2 style="margin-bottom:8px;">SwiftPay</h2>
        <h3>Password Reset Request</h3>
  
        <p>
          You requested to reset your password for your SwiftPay account.
        </p>
  
        <p>
          Click the button below to reset your password.
        </p>
  
        <a href="${resetLink}" 
           style="display:inline-block; margin-top:16px; padding:12px 24px; background:#2563eb; color:#fff; text-decoration:none; border-radius:6px;">
          Reset Password
        </a>
  
        <p style="margin-top:24px; font-size:13px; color:#6b7280;">
          This link will expire in 15 minutes.
          If you didn’t request this, you can safely ignore this email.
        </p>
  
        <p style="margin-top:24px; font-size:12px; color:#9ca3af;">
          © ${new Date().getFullYear()} SwiftPay. All rights reserved.
        </p>
      </div>
    </body>
    </html>
    `;
}
