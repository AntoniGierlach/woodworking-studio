export default function OfferPrice({ price }: { price?: string | null }) {
  const value = price?.trim();
  if (!value) return null;

  return (
    <p className="offer-price">
      <span className="offer-price-label">Cena</span>
      <strong className="offer-price-value">{value}</strong>
    </p>
  );
}
