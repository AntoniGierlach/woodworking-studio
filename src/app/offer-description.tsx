type OfferDescriptionProps = {
  shortDescription?: string | null;
  content?: string | null;
};

export default function OfferDescription({ shortDescription, content }: OfferDescriptionProps) {
  const intro = shortDescription?.trim();
  const description = content?.trim();
  if (!intro && !description) return null;

  const hasLongDescription = Boolean(description && description.length > 240);
  const previewText = intro || description;
  const preview =
    hasLongDescription && previewText
      ? `${previewText.slice(0, 200).trimEnd()}…`
      : previewText;

  return (
    <div className="offer-copy">
      {hasLongDescription ? (
        <>
          <p className="offer-copy-intro">{preview}</p>
          <details className="offer-details">
            <summary>Pełny opis</summary>
            <p className="offer-copy-content">{description}</p>
          </details>
        </>
      ) : (
        <>
          {intro && <p className="offer-copy-intro">{intro}</p>}
          {description && <p className="offer-copy-content">{description}</p>}
        </>
      )}
    </div>
  );
}
