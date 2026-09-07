const puppeteer = require('puppeteer');
const path = require('path');
(async () => {
  const browser = await puppeteer.launch({args: ['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  const resumeHtmlPath = path.resolve(__dirname, 'resume_source.html');
  await page.goto(`file://${resumeHtmlPath}`, {waitUntil: 'networkidle0'});
  await page.pdf({path: path.resolve(__dirname, 'resume.pdf'), format: 'A4', printBackground: true});
  await browser.close();
  console.log('Resume PDF generated successfully');
})();
