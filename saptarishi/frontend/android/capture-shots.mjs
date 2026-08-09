import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shotsHtml = path.join(__dirname, "shots.html");
const outDir = path.join(__dirname, "previews", "screen-shots");

const shots = [
  "01-home",
  "07-dasha",
  "08-horoscope",
  "09-dos-dont",
  "02-kundali",
  "03-remedy",
  "04-auspicious",
  "04b-auspicious-range",
  "05-profile-options",
  "06-menu-all-options",
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 2400 },
  deviceScaleFactor: 2,
});

await page.goto(pathToFileURL(shotsHtml).href, { waitUntil: "networkidle" });

for (const name of shots) {
  const phone = page.locator(`[data-shot="${name}"]`);
  await phone.scrollIntoViewIfNeeded();
  const file = path.join(outDir, `${name}.png`);
  await phone.screenshot({ path: file, type: "png" });
  console.log(`Saved ${file}`);
}

await browser.close();
console.log(`Done. ${shots.length} screenshots in ${outDir}`);
