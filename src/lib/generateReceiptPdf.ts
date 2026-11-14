import { jsPDF} from "jspdf";

export type ReceiptPaymentData = {
    id: number;
    amount: number;
    paidOn: string;
    month: string;
    method: string;
    type? : string;
    paymentType?: string;
    note: string | null;
    propertyName: string;
    unitNumber: number;
    tenantName: string;
};

function formatReceiptAmount(amount: number): string{
    const num = Number(amount) || 0;
    return `Rs. ${num.toLocaleString("en-IN",{
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatReceiptDate(rawDate: string): string{
    if(!rawDate) return "N/A";
    const parsed = new Date(rawDate);
    if(Number.isNaN(parsed.getTime())){
        return rawDate.slice(0,10);
    }
    return parsed.toLocaleDateString("en-IN",{
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}
export function downloadPaymentReceiptPdf(payment: ReceiptPaymentData): void{
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    const receiptNo = `REC-${String(payment.id).padStart(4,"0")}`;
    const category = String(
        payment.paymentType ?? payment.type ?? "RENT"
    ).toUpperCase();
    // outer receipt border
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.rect(15, 15, 180, 145);

    // header band
    doc.setFillColor(37, 99, 235);
    doc.rect(15, 15, 180, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Rentello", 22, 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("OFFICIAL PAYMENT RECEIPT", 22, 33);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Receipt #: ${receiptNo}`, 188, 26, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Paid On: ${formatReceiptDate(payment.paidOn)}`, 188, 33, {align: "right"});
    // tenant and property details
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Received From:", 22, 50)
    doc.setFont("helvetica", "normal");
  doc.text(payment.tenantName || "Tenant", 55, 50);

  doc.setFont("helvetica", "bold");
  doc.text("Property / Unit:", 22, 58);
  doc.setFont("helvetica", "normal");
  const locationText = payment.propertyName
    ? `${payment.propertyName} — Unit ${payment.unitNumber}`
    : `Unit ${payment.unitNumber}`;
  doc.text(locationText, 55, 58);

  doc.setFont("helvetica", "bold");
  doc.text("Billing Month:", 22, 66);
  doc.setFont("helvetica", "normal");
  doc.text(payment.month || "N/A", 55, 66);

  doc.setFont("helvetica", "bold");
  doc.text("Payment Mode:", 22, 74);
  doc.setFont("helvetica", "normal");
  doc.text(payment.method || "N/A", 55, 74);

  // Summary Table Header
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(22, 84, 166, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("DESCRIPTION", 26, 90.5);
  doc.text("AMOUNT", 184, 90.5, { align: "right" });

  // Line Item Row
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const itemLabel = `${category} Payment (${payment.month})`;
  doc.text(itemLabel, 26, 102);
  doc.text(formatReceiptAmount(payment.amount), 184, 102, {
    align: "right",
  });

  // Optional Audit Note
  if (payment.note && payment.note.trim()) {
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    const noteLines = doc.splitTextToSize(
      `Note: ${payment.note.trim()}`,
      158
    );
    doc.text(noteLines, 26, 110);
    doc.setTextColor(15, 23, 42);
  }

  // Divider & Total Paid
  doc.setDrawColor(203, 213, 225);
  doc.line(22, 122, 188, 122);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL AMOUNT RECEIVED", 26, 131);
  doc.setTextColor(22, 163, 74); // emerald-600
  doc.text(formatReceiptAmount(payment.amount), 184, 131, {
    align: "right",
  });

  // Footer & Signature
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    "This is a computer-generated receipt issued via Rentello.",
    22,
    151
  );

  doc.setDrawColor(148, 163, 184);
  doc.line(140, 146, 186, 146);
  doc.text("Authorized Signature", 163, 151, { align: "center" });

  doc.save(`rentello-receipt-${payment.id}.pdf`);
}