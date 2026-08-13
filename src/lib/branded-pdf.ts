import { jsPDF } from "jspdf";

export type PdfTableRow = (string | number)[];

export function openBrandedTablePdf(options: {
  title: string;
  subtitle?: string;
  filename: string;
  columns: string[];
  rows: PdfTableRow[];
  summary?: Array<[string, string]>;
}) {
  const tab = window.open("", "_blank");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const left = 14;
  const width = 182;
  const colWidth = width / options.columns.length;
  let y = 18;

  const header = () => {
    pdf.setFillColor(79, 70, 229); pdf.rect(0, 0, 210, 7, "F");
    pdf.setTextColor(15, 23, 42); pdf.setFont("helvetica", "bold"); pdf.setFontSize(18);
    pdf.text(options.title, left, 20);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(100, 116, 139);
    if (options.subtitle) pdf.text(options.subtitle, left, 26);
    y = options.subtitle ? 34 : 29;
  };
  const tableHeader = () => {
    pdf.setFillColor(241, 245, 249); pdf.rect(left, y - 5, width, 8, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor(51, 65, 85);
    options.columns.forEach((column, i) => pdf.text(column, left + i * colWidth + 1.5, y));
    y += 7;
  };
  header(); tableHeader();
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5);
  options.rows.forEach((row, rowIndex) => {
    if (y > 275) { pdf.addPage(); header(); tableHeader(); }
    if (rowIndex % 2) { pdf.setFillColor(248, 250, 252); pdf.rect(left, y - 4.5, width, 7, "F"); }
    pdf.setTextColor(30, 41, 59);
    row.forEach((value, i) => {
      const text = pdf.splitTextToSize(String(value ?? "—"), colWidth - 3)[0] ?? "";
      pdf.text(text, left + i * colWidth + 1.5, y);
    });
    y += 7;
  });
  if (options.summary?.length) {
    y += 4; pdf.setDrawColor(226, 232, 240); pdf.line(left, y - 3, left + width, y - 3);
    options.summary.forEach(([label, value]) => {
      pdf.setFont("helvetica", "bold"); pdf.text(label, left, y); pdf.text(value, left + width, y, { align: "right" }); y += 7;
    });
  }
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.setTextColor(100, 116, 139);
    pdf.text("POWERED BY ORCA SOLUTIONS", 105, 290, { align: "center" });
    pdf.text(`${page} / ${pages}`, 196, 290, { align: "right" });
  }
  const data = pdf.output("datauristring");
  if (!tab) return pdf.save(options.filename);
  const safeTitle = options.title.replace(/[<>&"]/g, "");
  tab.document.write(`<!doctype html><html><head><title>${safeTitle}</title><style>*{box-sizing:border-box}body{margin:0;height:100vh;background:#f1f5f9;font-family:Arial;display:flex;flex-direction:column}.bar{height:58px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;padding:0 20px}.title{font-size:14px;font-weight:700;color:#0f172a}.sub{font-size:11px;color:#64748b;margin-top:3px}.btn{border:0;border-radius:7px;background:#4f46e5;color:#fff;padding:8px 15px;font-weight:700;cursor:pointer}.wrap{flex:1;padding:14px 14px 0}.wrap iframe{width:100%;height:100%;border:0;border-radius:8px;box-shadow:0 2px 12px #0002}.foot{text-align:center;padding:8px;font-size:10px;letter-spacing:.15em;font-weight:700;color:#64748b}</style></head><body><div class="bar"><div><div class="title">${safeTitle}</div><div class="sub">${options.subtitle ?? "PDF document"}</div></div><button class="btn" onclick="dl()">Download PDF</button></div><div class="wrap"><iframe src="${data}"></iframe></div><div class="foot">POWERED BY ORCA SOLUTIONS</div><script>function dl(){const a=document.createElement('a');a.href='${data}';a.download='${options.filename}';a.click()}</script></body></html>`);
  tab.document.close();
}
