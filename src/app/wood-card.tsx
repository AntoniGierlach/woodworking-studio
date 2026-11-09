import Image from "next/image";

export type WoodCardData = {
  title: string;
  tone: string;
  grain: string;
  character: string;
  imageUrl: string | null;
};

export default function WoodCard({ wood, index }: { wood: WoodCardData; index: number }) {
  return (
    <article className="wood-kind">
      <span className="wood-kind-number">{String(index + 1).padStart(2, "0")}</span>
      <div className="wood-kind-content">
        <h3>{wood.title}</h3>
        {wood.imageUrl && (
          <div className="wood-kind-image">
            <Image alt={`Próbka drewna: ${wood.title}`} fill sizes="(max-width: 760px) 100vw, 400px" src={wood.imageUrl} />
          </div>
        )}
        <dl>
          <div><dt>Ton</dt><dd>{wood.tone}</dd></div>
          <div><dt>Usłojenie</dt><dd>{wood.grain}</dd></div>
          <div><dt>Charakterystyka</dt><dd>{wood.character}</dd></div>
        </dl>
      </div>
      <span aria-hidden="true" className="wood-kind-mark">{wood.title.slice(0, 1).toLocaleUpperCase("pl")}</span>
    </article>
  );
}
