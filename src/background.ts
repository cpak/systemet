import cheerio from "cheerio";
import { AdditionalProductDataMsg, AdditionalProductData } from "./types";

const UNTAPPD_BASE_URL = "https://untappd.com";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// TODO: get structured product data from Systembolaget search
// window.appSettings.ocpApimSubscriptionKey

function parseUntappdHtml(html: string): [string | null, string | null, number] {
  const $doc = cheerio.load(html);
  const $firstItem = $doc(".beer-item").first();
  const itemPath = $firstItem.find("a[href^=\\/beer\\/]").first()?.attr("href");
  const url = itemPath ? `${UNTAPPD_BASE_URL}${itemPath}` : null;
  const name = $firstItem.find(".beer-item .beer-details").text().split("\n").filter(Boolean).join(", ");
  const $rating = $firstItem.find(".rating .caps").first();
  const rating = parseFloat($rating.data("rating"));
  return [name, url, rating];
}

async function fetchUntappdData(query: string): Promise<AdditionalProductData> {
  const cached = await chrome.storage.local.get(query);
  if (
    cached &&
    cached[query] &&
    cached[query].date < Date.now() + CACHE_TTL_MS
  ) {
    console.log(`"${query}" from cache`);
    return cached[query];
  }
  const searchUrl = `${UNTAPPD_BASE_URL}/search?q=${encodeURIComponent(query)}`;
  const html = await fetch(searchUrl, { method: "GET", mode: "cors" }).then(
    (r) => r.text()
  );
  const [name, url, rating] = parseUntappdHtml(html);
  const r = { name: name || "unknown", url: url || searchUrl, rating, date: Date.now() };
  chrome.storage.local.set({ [query]: r });
  console.log(`"${query}" => ${rating} ${url}`);
  return r;
}

chrome.runtime.onMessage.addListener(function (
  request: AdditionalProductDataMsg,
  sender,
  sendResponse
) {
  fetchUntappdData(request.productName).then(sendResponse);
  return true;
});
