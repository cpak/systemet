import { delay, notNull, serial } from "./utils";
import {
  ExternalProductData,
  ExternalProductDataMsg,
  ExternalProductError,
  ProductType,
} from "./types";

interface SystemetProduct {
  name: string;
  id: string;
  type: ProductType;
  $root: Element;
  $ext: Element;
}

const SPACE_OR_NEWLINE = /\s|\n/;
const OL_OR_VIN = /\/produkt\/(ol|vin)\//;
const BLACK_LISTED_WORDS = ["beer"];
const ACTIVE_CATEGORIES = ["öl", "vin"];

function fetchExternalData(
  product: SystemetProduct
): Promise<ExternalProductData | null> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        productName: product.name,
        productType: product.type,
      } as ExternalProductDataMsg,
      ([err, data]) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      }
    );
  });
}

function extElement(className: string) {
  const $ext = document.createElement("div");
  $ext.classList.add("systemet", className);
  return $ext;
}

const TYPE_TO_ICON = {
  [ProductType.BEER]: "🍻",
  [ProductType.WINE]: "🍷🇫🇷",
};
function renderExternalData(
  product: SystemetProduct,
  data: ExternalProductData | null
) {
  if (!data) {
    product.$ext.innerHTML = "❓";
    return;
  }
  const $a = document.createElement("a");
  $a.href = data.url;
  $a.target = "_blank";
  $a.title = data.name;
  const icon = TYPE_TO_ICON[product.type];
  $a.innerHTML = [
    `<span class="systemet-icon">${icon}</span>`,
    `<span class="systemet-rating">${data.rating}</span>`,
  ].join("\n");
  product.$ext.innerHTML = "";
  product.$ext.append($a);
}

function renderErrorData(product: SystemetProduct, data: ExternalProductError) {
  const $a = document.createElement("a");
  $a.href = data.url;
  $a.target = "_blank";
  $a.title = data.msg;
  const icon = TYPE_TO_ICON[product.type];
  $a.innerHTML = `<span class="systemet-icon">${icon} ❓</span>`;
  product.$ext.innerHTML = "";
  product.$ext.append($a);
}

function productIdFromUrl(url: URL): string {
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
    .then(d => renderExternalData(product, d))
    .catch(d => renderErrorData(product, d));
}

function productNameFromEl($el: Element): string | undefined {
  return $el
    .querySelector("h3")
    ?.innerText?.split(SPACE_OR_NEWLINE)
    .filter((s) => s && !BLACK_LISTED_WORDS.includes(s.toLowerCase()))
    .join(" ");
}

function productFromEl($a: Element): SystemetProduct | null {
  const $el = $a.parentElement;
  const href = $a.getAttribute("href");
  if (!$el || !href) return null;
  const url = new URL(
    window.location.protocol + "//" + window.location.hostname + href
  );
  const id = productIdFromUrl(url);
  const name = productNameFromEl($el);
  const type = productTypeFromUrl(url);
  if (!id || !name || !type) return null;
  const $ext = extElement("list-item");
  $el.append($ext);
  return { id, name, type, $root: $el, $ext };
}

function findProductsInList(): SystemetProduct[] {
  return Array.from(
    document.querySelectorAll("a[href*=produkt]"),
    productFromEl
  ).filter(notNull);
}

function findProductInPage(url: URL): SystemetProduct | null {
  const name = document.title.split("|")[0].trim();
  const id = productIdFromUrl(url);
  const type = productTypeFromUrl(url);
  const $root = document.querySelector("main");
  if (!id || !name || !type || !$root) return null;
  const $ext = extElement("single-item");
  $root?.querySelector("h1")?.after($ext);
  return { id, name, type, $root, $ext };
}

async function init() {
  const pageUrl = new URL(window.location.href);
  const queryParams = new URLSearchParams(pageUrl.search);
  let products: SystemetProduct[] = [];
  if (
    ACTIVE_CATEGORIES.includes(queryParams.get("categoryLevel1")?.toLowerCase() || "")
  ) {
    console.log("init");
    await delay(500);
    products = findProductsInList();
  } else if (OL_OR_VIN.test(pageUrl.pathname)) {
    products = [findProductInPage(pageUrl)].filter(notNull);
  }
  if (products.length) {
    console.log(`${products.length} products`);
    products.forEach(
      (p) => (p.$ext.innerHTML = '<span class="systemet-loading">⌛</span>')
    );
    serial<SystemetProduct, void>(addExternalData, products);
  }
}

window.addEventListener("load", init);
