export function groupInvitationTemplate(params: {
  inviterName: string;
  groupName: string;
  inviteLink: string;
}) {
  const { inviterName, groupName, inviteLink } = params;

  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background:#f5f7fb; padding:40px;">
      <div style="max-width:600px; margin:auto; background:#fff; border-radius:8px; padding:32px;">
        
        <h2>SwiftPay</h2>
        <h3>You’ve been invited to join a savings group 🎉</h3>
  
        <p>
          <strong>${inviterName}</strong> invited you to join the group:
        </p>
  
        <p style="font-size:18px; font-weight:600;">
          ${groupName}
        </p>
  
        <p>
          This group allows members to contribute toward a shared financial goal.
        </p>
  
        <a href="${inviteLink}" 
           style="display:inline-block; margin-top:16px; padding:12px 24px; background:#16a34a; color:#fff; text-decoration:none; border-radius:6px;">
          Join Group
        </a>
  
        <p style="margin-top:24px; font-size:13px; color:#6b7280;">
          Only invited members can join this group.
          If you weren’t expecting this invite, you can ignore this email.
        </p>
  
        <p style="margin-top:24px; font-size:12px; color:#9ca3af;">
          © ${new Date().getFullYear()} SwiftPay. All rights reserved.
        </p>
      </div>
    </body>
    </html>
    `;
}
