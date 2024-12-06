const puppeteer = require("puppeteer-extra");
const fs = require("fs").promises;
const { DEFAULT_INTERCEPT_RESOLUTION_PRIORITY } = require("puppeteer");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");

puppeteer.use(
  AdblockerPlugin({
    interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY,
  })
);

const CONFIG = {
  TARGET_URL: "https://www.sinoptik.bg/sofia-bulgaria-100727011",
  USER_AGENT:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
  CLOUDINESS_TAB: ".wfCloudiness a",
  LIST_ITEMS: "#wfCloudiness ul li a",
  VIEWPORT: { width: 1280, height: 720 },
};

// Helper function to download images
async function downloadImages(res) {
  try {
    const url = new URL(res.url());
    const buffer = await res.buffer();
    const fileName = url.pathname
      .substring(url.pathname.lastIndexOf("/") + 1)
      .replace(/[:]/g, "-");
    await fs.writeFile(`./${fileName}`, buffer);
    console.log(`Image downloaded successfully: ${fileName}`);
  } catch (err) {
    console.error(`Error downloading image: ${err.message}`);
  }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: false,
  });
  const page = await browser.newPage();
  await page.setViewport(CONFIG.VIEWPORT);
  await page.setUserAgent(CONFIG.USER_AGENT);

  try {
    await page.goto(CONFIG.TARGET_URL, { waitUntil: "domcontentloaded" });

    const cloudinessTabBtn = await page.waitForSelector(CONFIG.CLOUDINESS_TAB);
    await cloudinessTabBtn.click();

    // Set up response listener for downloading images
    page.on("response", async (res) => {
      if (res.url().includes("sinoptik/images/maps/")) {
        await downloadImages(res);
      }
    });

    await page.waitForSelector(CONFIG.LIST_ITEMS);

    const liElements = await page.$$(CONFIG.LIST_ITEMS);

    // Handle each list item
    for (const li of liElements) {
      await Promise.all([page.waitForNetworkIdle(), li.scrollIntoView()]);
      const box = await li.boundingBox();
      if (box) {
        await page.mouse.move(box.x, box.y);
      }
    }
  } catch (err) {
    console.error("An error occurred:", err.message);
  } finally {
    await browser.close();
  }
})();
