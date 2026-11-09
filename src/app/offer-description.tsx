type OfferDescriptionProps = {
  shortDescription?: string | null;
  content?: string | null;
};

export default function OfferDescription({ shortDescription, content }: OfferDescriptionProps) {
  if (!shortDescription && !content) return null;

  return (
    <div className="offer-copy">
      {shortDescription && <p className="offer-copy-intro">{shortDescription}</p>}
      {content && <p className="offer-copy-content">{content}</p>}
    </div>
  );
}
