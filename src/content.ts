function fetchProducts() {
  fetch("https://api-extern.systembolaget.se/sb-api-ecommerce/v1/productsearch/search?size=30&page=1&categoryLevel1=%C3%96l&isEcoFriendlyPackage=false&isInDepotStockForFastDelivery=false",
  { "mode": "cors" });
}

function init(): void {
  const sp = new URLSearchParams(window.location.search);
  if (sp.get("categoryLevel1")?.toLowerCase() === "öl") {
    console.log("content: init");
  }

}

window.addEventListener("load", init);