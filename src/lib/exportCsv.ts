export type CsvRow = Record<
  string,
  string | number | boolean | null | undefined
>;

function escapeCsvCell(
  value: string | number | boolean | null | undefined
): string {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  // Wrap in quotes if text has commas, quotes, or line breaks
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function downloadCsv(
  filename: string,
  headers: { key: string; label: string }[],
  rows: CsvRow[]
): void {
  const headerLine = headers
    .map((h) => escapeCsvCell(h.label))
    .join(",");

  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsvCell(row[h.key])).join(",")
  );

  // \uFEFF tells Excel to read the file as UTF-8
  const csvContent =
    "\uFEFF" + [headerLine, ...dataLines].join("\r\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    filename.endsWith(".csv") ? filename : `${filename}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}