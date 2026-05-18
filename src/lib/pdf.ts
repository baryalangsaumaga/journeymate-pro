import jsPDF from "jspdf";

interface ReportSection { title: string; rows: Array<[string, string]>; }

interface ReportInput {
  title: string;
  subtitle?: string;
  sections: ReportSection[];
  footer?: string;
}

export function generatePDF({ title, subtitle, sections, footer }: ReportInput): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = 56;

  // Brand bar
  doc.setFillColor(13, 148, 100);
  doc.rect(0, 0, W, 8, "F");

  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 25);
  doc.text("TrailSync", 40, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 130);
  doc.text("Travel Companion · Report", W - 40, y, { align: "right" });
  y += 24;
  doc.setDrawColor(230, 230, 235);
  doc.line(40, y, W - 40, y);
  y += 28;

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 25);
  doc.text(title, 40, y);
  y += 18;
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 130);
    doc.text(subtitle, 40, y);
    y += 16;
  }
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 160);
  doc.text(`Generated ${new Date().toLocaleString()}`, 40, y);
  y += 24;

  // Sections
  for (const section of sections) {
    if (y > H - 100) { doc.addPage(); y = 56; }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(13, 148, 100);
    doc.text(section.title.toUpperCase(), 40, y);
    y += 6;
    doc.setDrawColor(13, 148, 100);
    doc.setLineWidth(1.5);
    doc.line(40, y, 90, y);
    doc.setLineWidth(0.5);
    y += 18;

    for (const [label, value] of section.rows) {
      if (y > H - 60) { doc.addPage(); y = 56; }
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 130);
      doc.text(label, 40, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 35);
      const split = doc.splitTextToSize(value, W - 240);
      doc.text(split, 200, y);
      y += Math.max(16, split.length * 13);
    }
    y += 14;
  }

  // Footer on every page
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 170);
    doc.text(footer ?? "TrailSync · trailsync.app", 40, H - 24);
    doc.text(`Page ${i} of ${total}`, W - 40, H - 24, { align: "right" });
  }
  return doc;
}

export function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function downloadJSON(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
