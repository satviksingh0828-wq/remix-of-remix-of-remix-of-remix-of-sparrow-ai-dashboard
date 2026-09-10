export async function sendPayrollEmail(options: {
  to: string;
  employeeName: string;
  periodLabel: string;
  filename: string;
  pdfBase64: string;
}) {
  const response = await fetch("/api/hr/payroll-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    let message = `Payroll email failed (${response.status})`;
    try {
      const body = await response.json() as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep the status-based message when the server did not return JSON.
    }
    throw new Error(message);
  }

  return true;
}
