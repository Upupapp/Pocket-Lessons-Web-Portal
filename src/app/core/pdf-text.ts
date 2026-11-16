/**
 * Reads the text of a PDF in the browser with pdf.js (no server needed).
 * Lines are rebuilt from the text positions; a wider gap between lines becomes a blank line (a new paragraph).
 * Small print (footers) and lines repeated on every page are left out.
 */

interface Line {
  page: number;
  y: number;
  height: number;
  text: string;
}

const TERMINAL = /[.!?]["”’)]?$/;

export async function pdfToText(file: Blob): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;

  const lines: Line[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const rows: { y: number; height: number; parts: { x: number; end: number; str: string }[] }[] = [];
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const [, , , , x, y] = item.transform as number[];
      const row = rows.find((r) => Math.abs(r.y - y) < 2.5);
      const part = { x, end: x + item.width, str: item.str };
      if (row) {
        row.parts.push(part);
        row.height = Math.max(row.height, item.height);
      } else rows.push({ y, height: item.height, parts: [part] });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      r.parts.sort((a, b) => a.x - b.x);
      const text = r.parts.reduce((acc, p, i) => {
        if (i === 0) return p.str;
        const gap = p.x - r.parts[i - 1].end;
        return acc + (gap > 1 && !acc.endsWith(' ') && !p.str.startsWith(' ') ? ' ' : '') + p.str;
      }, '');
      lines.push({ page: n, y: r.y, height: r.height, text: text.replace(/\s+/g, ' ').trim() });
    }
  }
  await doc.destroy();
  if (!lines.length) return '';

  // Body text size: the most common line height.
  const counts = new Map<number, number>();
  for (const l of lines) counts.set(Math.round(l.height), (counts.get(Math.round(l.height)) ?? 0) + 1);
  const body = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];

  // The same line at the same height on two or more pages is a header or footer.
  // (Matching the position too keeps repeated answer choices, like "A) Sapin-sapin" in two questions.)
  const spot = (l: Line) => `${Math.round(l.y / 4)}|${l.text}`;
  const pagesFor = new Map<string, Set<number>>();
  for (const l of lines) (pagesFor.get(spot(l)) ?? pagesFor.set(spot(l), new Set()).get(spot(l))!).add(l.page);
  const kept = lines.filter((l) => Math.round(l.height) >= body * 0.8 && (pagesFor.get(spot(l))?.size ?? 0) < 2);

  // Normal line spacing: the most common gap between neighbouring lines on a page.
  const gaps = new Map<number, number>();
  kept.forEach((l, i) => {
    const prev = kept[i - 1];
    if (prev && prev.page === l.page) {
      const g = Math.round(prev.y - l.y);
      if (g > 0) gaps.set(g, (gaps.get(g) ?? 0) + 1);
    }
  });
  const step = [...gaps.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? body * 1.4;

  let out = '';
  kept.forEach((l, i) => {
    const prev = kept[i - 1];
    if (!prev) out = l.text;
    else if (prev.page !== l.page) out += (TERMINAL.test(prev.text) ? '\n\n' : '\n') + l.text;
    else out += (prev.y - l.y > step * 1.5 ? '\n\n' : '\n') + l.text;
  });
  return out;
}
