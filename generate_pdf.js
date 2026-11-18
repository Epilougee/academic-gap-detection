import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const htmlPath = path.resolve('./report/report.html');
  const pdfPath = path.resolve('./report/Academic_Gap_Detection_System_Report.pdf');

  console.log('Loading HTML file:', htmlPath);
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });

  // Evaluate page heights and check for overflow
  const pageMetrics = await page.evaluate(() => {
    const pages = document.querySelectorAll('.page');
    return Array.from(pages).map((p, idx) => {
      return {
        pageIndex: idx + 1,
        id: p.id,
        clientHeight: p.clientHeight,
        scrollHeight: p.scrollHeight,
        overflow: p.scrollHeight > p.clientHeight + 1
      };
    });
  });

  console.log('Page overflow analysis:');
  let hasOverflow = false;
  for (const m of pageMetrics) {
    console.log(`Page ${m.pageIndex} (${m.id}): clientHeight=${m.clientHeight}px, scrollHeight=${m.scrollHeight}px, overflow=${m.overflow}`);
    if (m.overflow) {
      hasOverflow = true;
    }
  }

  // Generate PDF
  console.log('Exporting PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 }
  });
  console.log('PDF saved to:', pdfPath);

  // Render pages 1, 5, 6, 8 to PNG for visual inspection
  const pagesToRender = [1, 5, 6, 8];
  for (const pNum of pagesToRender) {
    const element = await page.$(`#page-${pNum}`);
    if (element) {
      const outImg = path.resolve(`./report/page_${pNum}_preview.png`);
      await element.screenshot({ path: outImg });
      console.log(`Rendered page ${pNum} preview to: ${outImg}`);
    }
  }

  await browser.close();

  if (hasOverflow) {
    console.warn('WARNING: Some pages have overflow content!');
  } else {
    console.log('SUCCESS: All pages fit cleanly within their A4 boundaries!');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
