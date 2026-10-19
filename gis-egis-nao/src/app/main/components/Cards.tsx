import Card from "./Card";
import type { WebMap } from "./Card";
import type { SectionData } from "../data";
interface CardsProps {
  cards: SectionData[];
  webMaps: WebMap[];
  /** Поисковый запрос (в нижнем регистре): карточки раскрываются с подходящими картами */
  query?: string;
}

export default function Cards({
  cards,
  webMaps,
  query = "",
}: CardsProps) {
  return (
    <div className="w-full max-w-[1400px] mx-auto flex flex-col gap-[24px]">

      <div className="text-[18px] text-title">
        <h2>Разделы системы</h2>
      </div>

      {cards.length === 0 ? (
        <p className="text-footer text-[14px]">
          По запросу «{query}» ничего не найдено — ни среди разделов, ни среди карт.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-[16px]">
          {cards.map((section) => (
            <Card
              key={section.id} section={section}
              webMaps={webMaps}
              query={query}
            />
          ))}
        </div>
      )}

    </div>
  );
}
