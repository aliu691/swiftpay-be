export function groupCompletedTemplate(params: {
  groupName: string;
  amount: number;
}) {
  return `
      <h2>🎉 Group Completed!</h2>
      <p>Your group <strong>${params.groupName}</strong> has reached its target.</p>
      <p>Total Amount: ₦${params.amount}</p>
      <p>You can now initiate payout from your dashboard.</p>
    `;
}
