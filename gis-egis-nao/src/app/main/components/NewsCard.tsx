import { NewsItem } from "@/app/lib/news";
import DOMPurify from "isomorphic-dompurify";
interface NewsCardProps {
  news: NewsItem;
};
export default function NewsCard({ news }: NewsCardProps) {
  const safeTitle = DOMPurify.sanitize(news.title, {
    USE_PROFILES: { html: true },
  });
  function formatId(id: number | string) {
  return String(id).padStart(2, "0");
}

function formatDate(date: string) {
  const [day, month, year] = date.split(".").map(Number);

  // Конструируем дату в UTC, чтобы избежать сдвига на предыдущий день
  // из-за часового пояса.
  const value = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}
  return (
    <div className="flex gap-[15px] bg-white shadow-md p-[15px] border-margin border-[1.5px] rounded-[12px]">
      <div className="text-accent flex items-center justify-center text-[16px] rounded-[12px] h-[40px] w-[40px] bg-bglogo border-[1.5px] border-accent/30 p-[8px]">{formatId(news.id)}</div>
      <div className="flex flex-col gap-[8px]">
        <div className="flex gap-[10px] items-center ">
          <span className="text-accent text-[12px] rounded-full py-[4px] px-[12px] w-fit bg-bglogo border-[1.5px] border-accent/30">{news.category}</span>
          <span className="text-footer text-[12px]">{formatDate(news.date)}</span>
        </div>
        <div dangerouslySetInnerHTML={{ __html: safeTitle }} />
      </div>
    </div>
  );
}
