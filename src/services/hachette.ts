import cheerio from "cheerio";
import { ExternalProduct, InternalProductData, ExternalProductData } from "../types";
import { cached } from "../utils";

const HACHETTE_BASE_URL = "https://www.hachette-vins.com";

function wineColorFromCat(cat2: string): string | undefined {
  const c2 = cat2.toLowerCase();
  if (c2 === "rött") return "rouge";
  if (c2 === "rosé") return "rosé";
  if (c2 === "vitt") return "blanc";
}

function wineTypeFromCat(cat2: string): string {
  const c2 = cat2.toLowerCase();
  if (c2 === "mousserande") return "effervescent";
  return "tranquille";
}

function hachetteUrl(product: InternalProductData): string {
  const url = new URL(`${HACHETTE_BASE_URL}/vins/list`);
  url.searchParams.set("search", product.name);
  const wineColor = wineColorFromCat(product.cat2);
  const wineType = wineTypeFromCat(product.cat2);
  if (wineColor) url.searchParams.set("filtre[couleur]", wineColor);
  if (wineType) url.searchParams.set("filtre[type]", wineType);
  if (product.vintage)
    url.searchParams.set("filtre[millesime]", product.vintage);
  return url.toString().replace(/%20/g, "+");
}

function parseHachetteHtml(html: string): ExternalProduct | undefined {
  const $doc = cheerio.load(html);
  let externalProduct: ExternalProduct | undefined;
  $doc(".vinResult .block").each((_, el) => {
    if (externalProduct) return;
    const $el = cheerio(el);
    const name = [
      $el.find(".title h2")?.text(),
      $el.find(".sub-title h2")?.text(),
    ]
      .filter(Boolean)
      .join(" ");
    const url = HACHETTE_BASE_URL + ($el.find(".title a")?.attr("href") || "");
    const year = $el
      .find(".stars h2")
      ?.text()
      .split(" ")
      .filter((s) => !isNaN(parseInt(s, 10)))[0];
    const rating = [
      $el.find(".stars .active").length.toString() || "0",
      $el.find(".which .icon-heart").length ? "❤" : "",
      year && `(${year})`,
    ]
      .filter(Boolean)
      .join(" ");
    if (name || url || rating) {
      externalProduct = { name, url, rating: rating.toString() };
    }
  });
  return externalProduct;
}

const getHachetteData = cached<ExternalProduct | undefined>((url: string) =>
  fetch(url, { mode: "cors" })
    .then((res) => res.text())
    .then(parseHachetteHtml)
);

export async function get(
  product: InternalProductData
): Promise<ExternalProductData> {
  const searchUrl = hachetteUrl(product);
  return { searchUrl, product: await getHachetteData(searchUrl) };
}