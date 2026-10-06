import Card from "./Card";
import type { CardProps, WebMap } from "./Card";

interface CardsProps {
  cards: CardProps[];
  webMaps: WebMap[];
}

export default function Cards({
  cards,
  webMaps,
}: CardsProps) {
  return (
    <div className="w-full max-w-[1400px] mx-auto flex flex-col gap-[24px]">

      <div className="text-[18px] text-title">
        <h2>Разделы системы</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-[16px]">
        {cards.map((card) => (
          <Card
            key={card.name}
            {...card}
            webMaps={webMaps}
          />
        ))}
      </div>

    </div>
  );
}