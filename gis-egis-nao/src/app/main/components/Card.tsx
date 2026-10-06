import Image from "next/image";
import Link from "next/link";
export interface CardProps {
  name: string;
  shortName: string;
  category: string;
  statistic: string;
  img: string;
  link: string;
  shadowColor: string;
}

export default function Card({
  name,
  shortName,
  category,
  statistic,
  img,
  link,
  shadowColor,
}: CardProps) {
  return (
    <Link
      href={link}
      className="h-full shadow-xl group bg-white p-[20px] gap-[16px] flex flex-col items-start max-w-[220px] border-[1.5px] border-margin rounded-[12px] min-w-[170px] max-h-[240px] shadow-[1px] hover:[box-shadow:inset_0_-8px_24px_0_var(--shadow-color)]"
      style={{ "--shadow-color": shadowColor } as React.CSSProperties}
    >
      <div className=" px-[8px] py-[2px] uppercase text-accent text-[12px]  rounded-full py-[4px] px-[12px] w-fit bg-bglogo border-[1.5px] border-accent/30">
        <span>{shortName}</span>
      </div>
      <div>
        <Image className="block" src={img} alt={name} width={40} height={40} />
      </div>
      <div className="flex flex-1 flex-col items-start">
        <div className="text-left flex-1 text-[14px] text-card">
          <span>{name}</span>
        </div>
        <div className="text-[11px] text-footer">
          <span>{category}</span>
        </div>
      </div>
      <div
        className="pt-[12px] border-t-[1.5px] border-black/[12%] w-full
        flex items-start text-[11px] text-accent"
      >
        <span>{statistic}</span>
      </div>
    </Link>
  );
}
