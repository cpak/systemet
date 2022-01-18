export enum ProductType {
  BEER = "BEER",
  WINE = "WINE",
}

export interface SystemetProduct {
  url: string;
  type: ProductType;
  $root: Element;
  $ext: Element;
}

export interface InternalProductData {
  name: string;
  url: string;
  producer: string;
  vintage: string;
  type: ProductType;
  cat1: string;
  cat2: string;
}

export interface GetExternalProductDataMsg {
  url: string;
}

export interface ExternalProduct {
  name: string;
  rating: string;
  url: string;
}
export interface ExternalProductData {
  product?: ExternalProduct;
  searchUrl: string;
}

export interface ExternalProductError {
  msg: string;
  url: string;
}
