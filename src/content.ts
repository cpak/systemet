import { delay, notNull, serial } from "./utils";
import {
  ExternalProductData,
  ExternalProductDataMsg,
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
const BLACK_LISTED_WORDS = ["beer"];
const ACTIVE_CATEGORIES = ["öl", "vin"];

function fetchExternalData(
  product: SystemetProduct
): Promise<ExternalProductData | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        productName: product.name,
        productType: product.type,
      } as ExternalProductDataMsg,
      resolve
    );
  });
}

function appendExtElement($root: Element) {
  const $ext = document.createElement("div");
  $ext.classList.add("systemet");
  $root.append($ext);
  return $ext;
}

const TYPE_TO_ICON = {
  [ProductType.BEER]: "🍻",
  [ProductType.WINE]: "🍷",
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

async function addExternalData(product: SystemetProduct): Promise<void> {
  renderExternalData(product, await fetchExternalData(product));
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
  const id = url.pathname
    .split("/")
    .filter(Boolean)
    .reverse()[0]
    .split("-")
    .reverse()[0]
    .slice(0, -2);
  const name = productNameFromEl($el);
  let type;
  switch (url.pathname.split("/")[2]) {
    case "ol":
      type = ProductType.BEER;
      break;
    case "vin":
      type = ProductType.WINE;
      break;
  }
  if (!id || !name || !type) return null;
  const $ext = appendExtElement($el);
  return { id, name, type, $root: $el, $ext };
}

function findProducts(): SystemetProduct[] {
  return Array.from(
    document.querySelectorAll("a[href*=produkt]"),
    productFromEl
  ).filter(notNull);
}

async function init() {
  const sp = new URLSearchParams(window.location.search);
  if (
    ACTIVE_CATEGORIES.includes(sp.get("categoryLevel1")?.toLowerCase() || "")
  ) {
    console.log("init");
    await delay(500);
    const products = findProducts();
    console.log(`${products.length} products`);
    products.forEach(
      (p) => (p.$ext.innerHTML = '<span class="systemet-loading">⌛</span>')
    );
    serial<SystemetProduct, void>(addExternalData, products);
  }
}

window.addEventListener("load", init);
