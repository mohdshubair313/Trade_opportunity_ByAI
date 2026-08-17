import { listPaymentCatalog } from "./src/lib/api";

async function main() {
  try {
    const data = await listPaymentCatalog();
    console.log("Success! Data:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
