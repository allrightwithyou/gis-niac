
import Card from "./Card";
import type { CardProps } from "./Card";
interface CardsProps{
  cards:  CardProps[];

}

export default function Cards({cards}:CardsProps) {
 

  return (
    <div className=" w-full flex gap-[24px] max-w-[1400px] flex flex-col mx-auto w-full items-start">
      <div className="text-[18px] text-title">
        <h2>Разделы системы</h2>
        <button className="hidden"></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-[16px]">
        {cards.map((cards) => (
          <Card key={cards.shortName} {...cards} />
        ))}
      </div>
    </div>
  );
}
