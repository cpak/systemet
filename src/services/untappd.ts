import cheerio from "cheerio";
import {
  ExternalProduct,
  ExternalProductData,
  InternalProductData,
} from "../types";
import { cached } from "../utils";

const UNTAPPD_BASE_URL = "https://untappd.com";

const BLACK_LISTED_IN_NAME = new Set(["beer", "ab"]);

function untappdUrl(product: InternalProductData): string {
  const seen = new Set();
  const searchName = product.name.split(" ").filter(s => {
    const sl = s.toLowerCase();
    if (seen.has(sl) || BLACK_LISTED_IN_NAME.has(sl)) return false;
    return true;
  }).join(" ");
  return `${UNTAPPD_BASE_URL}/search?q=${encodeURIComponent(searchName)}`;
}

function parseUntappdHtml(html: string): ExternalProduct | undefined {
  const $doc = cheerio.load(html);
  let externalProduct: ExternalProduct | undefined;
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
    if (name && url && rating) {
      externalProduct = { name, url, rating: rating.toString() };
    }
  });
  return externalProduct;
}

const getUntappdData = cached<ExternalProduct | undefined>((url: string) =>
  fetch(url, { mode: "cors" })
    .then((res) => res.text())
    .then(parseUntappdHtml)
);

export async function get(
  product: InternalProductData
): Promise<ExternalProductData> {
  const searchUrl = untappdUrl(product);
  return { searchUrl, product: await getUntappdData(searchUrl) };
}
