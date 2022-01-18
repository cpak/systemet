import cheerio from "cheerio";
import { InternalProductData, ProductType } from "../types";

function typeFromCat(cat1: string): ProductType | undefined {
  const c1 = cat1.toLowerCase();
  if (c1 === "öl") return ProductType.BEER;
  if (c1 === "vin") return ProductType.WINE;
}

export async function get(
  productUrl: string
): Promise<InternalProductData | undefined> {
  const html = await fetch(productUrl, { mode: "cors" }).then((r) => r.text());
  const $doc = cheerio.load(html);
  const data = $doc("[data-react-component=ProductDetailPageContainer]")
    .first()
    .data("props").product;
  const name = [data.productNameBold, data.productNameThin]
    .filter(Boolean)
    .join(" ");
  const producer = data.producerName;
  const vintage = data.vintage;
  const type = typeFromCat(data.categoryLevel1);
  const cat1 = data.categoryLevel1;
  const cat2 = data.categoryLevel2;
  return name && type
    ? { name, url: productUrl, type, producer, vintage, cat1, cat2 }
    : undefined;
}
