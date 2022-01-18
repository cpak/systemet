import { delay, notNull, serial, debounce } from "./utils";
import {
  ExternalProductData,
  ExternalProductError,
  GetExternalProductDataMsg,
  ProductType,
  SystemetProduct,
} from "./types";

const OL_OR_VIN = /\/produkt\/(ol|vin)\//;
const ACTIVE_CATEGORIES = ["öl", "vin"];
const LOADING_HTML = '<span class="systemet-loading">⌛</span>';

function fetchExternalData(
  product: SystemetProduct
): Promise<ExternalProductData> {
  return new Promise((resolve, reject) => {
    const msg: GetExternalProductDataMsg = {
      url: product.url,
    };
    chrome.runtime.sendMessage(msg, ([err, data]) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

function extElement(className: string) {
  const $ext = document.createElement("div");
  $ext.classList.add("systemet", className);
  return $ext;
}

const TYPE_TO_ICON = {
  [ProductType.BEER]: "🍻",
  [ProductType.WINE]: "🍷 🇫🇷",
};
function renderExternalData(
  product: SystemetProduct,
  data: ExternalProductData
) {
  const icon = TYPE_TO_ICON[product.type];
  const $a = document.createElement("a");
  $a.target = "_blank";
  if (data.product) {
    $a.href = data.product.url;
    $a.title = data.product.name;
    $a.innerHTML = [
      `<span class="systemet-icon">${icon}</span>`,
      `<span class="systemet-rating">${data.product.rating}</span>`,
    ].join("\n");
  } else {
    $a.href = data.searchUrl;
    $a.title = "not found";
    $a.innerHTML = `<span class="systemet-icon">${icon} ❌</span>`;
  }
  product.$ext.innerHTML = "";
  product.$ext.append($a);
}

function renderErrorData(product: SystemetProduct, data: ExternalProductError) {
  const $a = document.createElement("a");
  $a.href = data.url;
  $a.target = "_blank";
  $a.title = data.msg;
  const icon = TYPE_TO_ICON[product.type];
  $a.innerHTML = `<span class="systemet-icon">${icon} 💥</span>`;
  product.$ext.innerHTML = "";
  product.$ext.append($a);
}

function productNumberFromUrl(url: URL): string {
  return url.pathname
    .split("/")
    .filter(Boolean)
    .reverse()[0]
    .split("-")
    .reverse()[0]
    .slice(0, -2);
}

function productTypeFromUrl(url: URL): ProductType | null {
  switch (url.pathname.split("/")[2]) {
    case "ol":
      return ProductType.BEER;
    case "vin":
      return ProductType.WINE;
  }
  return null;
}

function addExternalData(product: SystemetProduct): Promise<void> {
  return fetchExternalData(product)
    .then((d) => renderExternalData(product, d))
    .catch((d) => renderErrorData(product, d));
}

function productFromListEl($a: Element): SystemetProduct | null {
  const $el = $a.parentElement;
  const href = $a.getAttribute("href");
  if (!$el || !href) return null;
  const url = new URL(
    window.location.protocol + "//" + window.location.hostname + href
  );
  const productNumber = productNumberFromUrl(url);
  const type = productTypeFromUrl(url);
  if (!productNumber || !type) return null;
  const $ext = extElement("list-item");
  $el.append($ext);
  return { url: url.toString(), $root: $el, $ext, type };
}

function findProductsInList(seen: Set<Element>): SystemetProduct[] {
  return Array.from(document.querySelectorAll("a[href*=produkt]"), ($el) => {
    if (seen.has($el)) return null;
    seen.add($el);
    return productFromListEl($el);
  }).filter(notNull);
}

function findProductInPage(url: URL): SystemetProduct | null {
  const productNumber = productNumberFromUrl(url);
  const type = productTypeFromUrl(url);
  const $root = document.querySelector("main");
  if (!productNumber || !type || !$root) return null;
  const $ext = extElement("single-item");
  $root?.querySelector("h1")?.after($ext);
  return { url: url.toString(), type, $root, $ext };
}

async function decorateProductList(seen: Set<Element>) {
  const products = findProductsInList(seen);
  console.log(`${products.length} products`);
  products.forEach((p) => (p.$ext.innerHTML = LOADING_HTML));
  serial<SystemetProduct, void>(addExternalData, products);
}

function decorateProductPage(pageUrl: URL) {
  const product = findProductInPage(pageUrl);
  if (!product) return;
  product.$ext.innerHTML = LOADING_HTML;
  addExternalData(product);
}

async function init() {
  console.log("init");
  const pageUrl = new URL(window.location.href);
  const queryParams = new URLSearchParams(pageUrl.search);
  if (
    ACTIVE_CATEGORIES.includes(
      queryParams.get("categoryLevel1")?.toLowerCase() || ""
    )
  ) {
    await delay(500);
    const seen = new Set<Element>();
    decorateProductList(seen);
    window.addEventListener(
      "scroll",
      debounce(() => decorateProductList(seen), 1000)
    );
  } else if (OL_OR_VIN.test(pageUrl.pathname)) {
    decorateProductPage(pageUrl);
  }
}

window.addEventListener("load", init);
