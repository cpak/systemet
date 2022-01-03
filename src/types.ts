export enum ProductType {
  BEER = "BEER",
  WINE = "WINE",
}

export interface ExternalProductDataMsg {
  productType: ProductType;
  productName: string;
}

export interface ExternalProductData {
  name: string;
  rating: string;
  url: string;
}

export interface ExternalProductError {
  msg: string;
  url: string;
}
