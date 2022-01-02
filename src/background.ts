import cheerio from "cheerio";
import {
  ExternalProductDataMsg,
  ExternalProductData,
  ProductType,
} from "./types";

const HACHETTE_BASE_URL = "https://www.hachette-vins.com";
const UNTAPPD_BASE_URL = "https://untappd.com";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// TODO: get structured product data from Systembolaget search
// window.appSettings.ocpApimSubscriptionKey

function productData(name: string | null, url: string | null, rating: string | null): ExternalProductData | null {
  if (!name || !url || !rating) return null;
  return {name, url, rating};
}

function untappdUrl(productName: string): string {
  return `${UNTAPPD_BASE_URL}/search?q=${encodeURIComponent(productName)}`;
}

function parseUntappdHtml(html: string): ExternalProductData | null {
  const $doc = cheerio.load(html);
  let externalProduct: ExternalProductData | null = null;
  $doc(".beer-item").each((_, el) => {
    if (externalProduct) return;
    const $el = cheerio(el);
    const itemPath = $el.find("a[href^=\\/beer\\/]").first()?.attr("href");
    const url = itemPath ? `${UNTAPPD_BASE_URL}${itemPath}` : null;
    const name = $el
      .find(".beer-item .beer-details")
      .text()
      .split("\n")
      .filter(Boolean)
      .join(", ");
    const $rating = $el.find(".rating .caps").first();
    const rating = Math.round(100 * parseFloat($rating.data("rating"))) / 100;
    externalProduct = productData(name, url, rating.toString());
  });
  return externalProduct;
}

function hachetteUrl(productName: string): string {
  return `${HACHETTE_BASE_URL}/vins/list/?search=${encodeURIComponent(
    productName
  ).replace(/%20/g, "+")}`;
}

function parseHachetteHtml(html: string): ExternalProductData | null {
  const $doc = cheerio.load(html);
  let externalProduct: ExternalProductData | null = null;
  $doc(".vinResult .block")
    .each((_, el) => {
      if (externalProduct) return;
      const $el = cheerio(el);
      const name = [
        $el.find(".title h2")?.text(),
        $el.find(".sub-title h2")?.text(),
      ]
        .filter(Boolean)
        .join(" ");
      const url = HACHETTE_BASE_URL + ($el.find(".title a")?.attr("href") || "");
      const year = $el.find(".stars h2")?.text().split(" ").filter(s => !isNaN(parseInt(s, 10)))[0];
      const rating = [
        $el.find(".stars .active").length.toString() || "0",
        $el.find(".which .icon-heart").length ? "❤" : "",
        year && `(${year})`,
      ]
        .filter(Boolean)
        .join(" ");
      externalProduct = productData(name, url, rating);
    });
  return externalProduct;
}

async function fetchCached(url: string): Promise<string> {
  const cached = await chrome.storage.local.get(url);
  if (cached && cached[url] && cached[url].date < Date.now() + CACHE_TTL_MS) {
    console.log(`${url} from cache`);
    return cached[url];
  }
  return fetch(url, { method: "GET", mode: "cors" }).then((r) => r.text());
}

const TYPE_TO_CONFIG = {
  [ProductType.BEER]: { url: untappdUrl, parseResponse: parseUntappdHtml },
  [ProductType.WINE]: { url: hachetteUrl, parseResponse: parseHachetteHtml },
};

chrome.runtime.onMessage.addListener(function (
  request: ExternalProductDataMsg,
  sender,
  sendResponse
) {
  const { url, parseResponse } = TYPE_TO_CONFIG[request.productType];
  fetchCached(url(request.productName))
    .then(parseResponse)
    .then(p => {
      const logStr = p ? `${p.name} ${p.rating} ${p.url}` : "null";
      console.log(`${request.productName} (${request.productType}) => ${logStr}`);
      return p;
    })
    .then(sendResponse);
  return true;
});
