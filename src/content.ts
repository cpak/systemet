import { delay, notNull, serial } from "./utils";
import { AdditionalProductData, AdditionalProductDataMsg } from "./types";

function formatRating(r: number): number {
  return Math.round(r * 100) / 100;
}

function fetchAdditionalProductData(
  productName: string
): Promise<AdditionalProductData> {
  return new Promise((resolve, reject) => {
    const msg: AdditionalProductDataMsg = { productName };
    chrome.runtime.sendMessage(msg, function (data: AdditionalProductData) {
      resolve(data);
    });
  });
}

function appendExtElement($root: Element) {
  const $ext = document.createElement("div");
  $ext.classList.add("systemet");  
  $ext.style.fontFamily = "monospace";
  $ext.style.position = "absolute";
  $ext.style.margin = "-2em 0 0 1em";
  $root.append($ext);
  return $ext;
}

function showLoading($ext: Element) {
  $ext.innerHTML = '<span class="systemet-beers">🍻 Loading...</span>';
}

function showRating($ext: Element, data: AdditionalProductData) {
  const $a = document.createElement("a");
  $a.href = data.url;
  $a.target = "_blank";
  $a.title = data.name;
  $a.classList.add("systemet");
  $a.innerHTML = [
    '<span class="systemet-beers">🍻</span>',
    `<span class="systemet-rating">${formatRating(data.rating)}</span>`,
  ].join("\n");
  $ext.innerHTML = "";
  $ext.append($a);
}

async function addRating(product: Product): Promise<void> {
  if (!product.name) return;
  product.$ext = appendExtElement(product.$root);
  showLoading(product.$ext);
  showRating(product.$ext, await fetchAdditionalProductData(
    product.name
  ));
}

interface Product {
  name: string | undefined;
  id: string | undefined;
  $root: Element;
  $ext?: Element;
}

const SPACE_OR_NEWLINE = /\s|\n/;
const BLACK_LISTED_WORDS = ["beer"];
function productNameFromEl($el: Element): string | undefined {
  return $el
    .querySelector("h3")
    ?.innerText?.split(SPACE_OR_NEWLINE)
    .filter(s => s && !BLACK_LISTED_WORDS.includes(s.toLowerCase()))
    .join(" ");
}

function productIdFromEl($el: Element): string | undefined {
  return $el
    .querySelector("a")
    ?.href?.split("/")
    .filter(Boolean)
    .reverse()[0]
    ?.split("-")[1]
    ?.split("")
    .reverse()
    .slice(2)
    .reverse()
    .join("");
}

function findProductElements(): Product[] {
  return Array.from(
    document.querySelectorAll("a[href*=produkt]"),
    ($a) => $a.parentElement
  )
    .filter(notNull)
    .map(($el) => ({
      name: productNameFromEl($el),
      id: productIdFromEl($el),
      $root: $el,
    }));
}

async function init() {
  const sp = new URLSearchParams(window.location.search);
  if (sp.get("categoryLevel1")?.toLowerCase() !== "öl") {
    return;
  }
  await delay(500);
  const products = findProductElements();
  serial<Product, void>(addRating, products);
}

window.addEventListener("load", init);
