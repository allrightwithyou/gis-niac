import Image from "next/image";
import Link from "next/link";

export default async function SupportPage() {
 
  return (
    <div className="justify-center flex px-[24px] py-[40px] min-h-auto">
      <div className="max-w-[1400px] w-full flex flex-col gap-[34px]">
        <Link
          href="/main/"
          className="flex gap-[6px] pr-[12px] flex-row items-center border-margin "
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
          <span className="shadow-md uppercase text-accent text-[12px] rounded-full py-[4px] px-[12px] w-fit bg-bglogo border-[1.5px] border-accent/30">
            Служба поддержки
          </span>
        </div>
        <div className="flex flex-col gap-[15px]">
          <h1 className="text-3xl sm:text-4xl md:text-5xl text-title">Центр поддержки</h1>
          <p className="text-balance text-hero text-sm sm:text-base">
            Поможем решить технический вопрос, найти нужные данные или получить
            доступ к сервисам ЕГИС НАО.
          </p>
        </div>
        <div className="flex w-full border-[1.5px] p-[20px] border-margin bg-white shadow-md rounded-[15px] flex-col gap-[18px]">
          <span className="uppercase text-accent text-[14px]">Контакты</span>
          <div className="flex flex-col text-[14px]">
            <span className="text-footer">Электронная почта</span>
            <span className="text-title">gis@adm-nao.ru</span>
          </div>
           <div className="flex flex-col text-[14px]">
            <span className="text-footer">Телефон</span>
            <span className="text-title">+7 (81853) 2-39-07</span>
          </div>
           <div className="flex flex-col text-[14px]">
            <span className="text-footer">Время работы</span>
            <span className="text-title">Пн-Пт, 08:30-17:30</span>
          </div>
        </div>
      </div>
    </div>
  );
}
