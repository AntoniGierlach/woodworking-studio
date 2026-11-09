import { connection } from "next/server";
import { getContentAssetUrl, getWoodTypes } from "@/lib/content-data";
import WoodCarousel from "./wood-carousel";

export default async function WoodShowcase() {
  await connection();
  let woods;
  try {
    woods = await getWoodTypes();
  } catch (error) {
    console.error("Nie udało się pobrać gatunków drewna.", error);
    return <p className="wood-empty">Gatunki drewna są chwilowo niedostępne. Spróbuj ponownie później.</p>;
  }
  return <WoodCarousel woods={woods.map((wood) => ({
    ...wood,
    imageUrl: wood.image_id ? getContentAssetUrl(wood.image_id) : null,
  }))} />;
}
