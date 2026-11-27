/** Small dependency-free PDF writer for text-only, print-ready operational reports. */
function escapePdf(value: string): string { return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }

export function createReportPdf(title: string, sections: Array<{ heading: string; lines: string[] }>): Buffer {
  const lines = [title, ...sections.flatMap((section) => ['', section.heading, ...section.lines])];
  const perPage = 46;
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += perPage) pages.push(lines.slice(index, index + perPage));
  const objects: string[] = ['<< /Type /Catalog /Pages 2 0 R >>', ''];
  const pageIds: number[] = [];
  for (const page of pages) {
    const pageId = objects.length + 1; pageIds.push(pageId);
    const contentId = pageId + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentId} 0 R >>`);
    const content = ['BT', '/F1 10 Tf', '48 748 Td', ...page.map((line, i) => `${i === 0 ? '' : '0 -15 Td ' }(${escapePdf(line.slice(0, 110))}) Tj`), 'ET'].join('\n');
    objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`;
  let out = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((body, index) => { offsets.push(Buffer.byteLength(out)); out += `${index + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = Buffer.byteLength(out); out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'utf8');
}
