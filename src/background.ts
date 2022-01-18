import { get as hachetteGet } from "./services/hachette";
import { get as untappdGet } from "./services/untappd";
import { get as systembolagetGet } from "./services/systembolaget";
import {
  ProductType,
  GetExternalProductDataMsg,
  ExternalProduct,
} from "./types";

interface CacheItem {
  data: ExternalProduct | null;
  date: number;
}

const TYPE_TO_GETTER = {
  [ProductType.BEER]: untappdGet,
  [ProductType.WINE]: hachetteGet,
};

async function handleMessage(
  message: GetExternalProductDataMsg,
  sendResponse: (response?: any) => void
) {
  const inputLog = [message.url];
  try {
    const internalProduct = await systembolagetGet(message.url);
    if (!internalProduct)
      throw new Error("could not read internal product data");
    inputLog.push.apply(inputLog, [
      internalProduct.name,
      internalProduct.producer,
      internalProduct.vintage,
    ]);
    const getExternalProductData = TYPE_TO_GETTER[internalProduct.type];
    const externalProduct = await getExternalProductData(internalProduct);
    const outputLog = [externalProduct.searchUrl];
    if (externalProduct.product) {
      outputLog.push.apply(outputLog, [
        externalProduct.product.name,
        externalProduct.product.rating,
        externalProduct.product.url,
      ]);
    } else {
      outputLog.push("not found");
    }
    console.log(`${inputLog.join(", ")} => ${outputLog.join(", ")}`);
    sendResponse([null, externalProduct]);
  } catch (e) {
    console.error(`${inputLog.join(", ")} => error`, e);
    sendResponse([e, null]);
  }
}

chrome.runtime.onMessage.addListener(function (
  message: GetExternalProductDataMsg,
  sender,
  sendResponse
) {
  handleMessage(message, sendResponse);
  return true;
});
