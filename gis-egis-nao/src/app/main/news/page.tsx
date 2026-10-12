import Image from "next/image";
import Link from "next/link";
import { readFile } from "node:fs/promises";
import path from "node:path";
//import { readFile } from "node:fs/promises";
import { parseNewsFile } from "@/app/lib/news";
import NewsCard from "../components/NewsCard";
export default async function NewsPage() {
  //const fileContents = await readFile(
   // "C:/Users/rlubchich/Desktop/gisnao.news",
   // "utf8",
  //);
   const filePath = path.join(process.cwd(), "gisnao.news");
  const fileContents = await readFile(filePath, "utf8");
  const news = parseNewsFile(fileContents);
  return (
    <div className="justify-center flex px-[24px] py-[40px]">
      <div className="max-w-[1400px] w-full flex flex-col gap-[34px]">
        <Link
          href="/main/"
          className="flex gap-[6px] pr-[12px] flex-row items-center border-r-[1px] border-margin "
        >
          <Image
            className="block"
            src="/back.svg"
            alt="Назад"
            width={16}
            height={16}
          />{" "}
          <span className="text-hero hover:text-accent transition-colors text-[14px]">
            На главную
          </span>
        </Link>
        <div>
          <span className="shadow-md  uppercase text-accent text-[12px] rounded-full py-[4px] px-[12px] w-fit bg-bglogo border-[1.5px] border-accent/30">
            Пресс-центр
          </span>
        </div>
        <div className="flex flex-col gap-[15px]">
          <h1 className="text-3xl sm:text-4xl md:text-5xl">Новости системы</h1>
          <p className="text-balance text-hero text-sm sm:text-base">
            Обновления геопортала, новые наборы данных и важные события цифровой
            инфраструктуры округа.
          </p>
        </div>
        <div className="flex flex-col gap-[18px]">
          {news.map((item) => (
            <NewsCard key={item.id} news={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
