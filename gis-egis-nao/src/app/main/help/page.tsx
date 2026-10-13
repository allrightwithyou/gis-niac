"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
type FaqItem = {
  question: string;
  answer: string;
};

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqItems: FaqItem[] = [
    {
      question: "Почему слой не отображается?",
      answer:
        "Проверьте, включён ли слой в панели слоёв и соответствует ли текущий масштаб отображению слоя.",
    },
    {
      question: "Как часто обновляются данные?",
      answer:
        "Данные обновляются по мере появления новых материалов и изменений в геоинформационных системах.",
    },
    {
      question: "Что делать, если нет нужной карты?",
      answer:
        "Обратитесь в поддержку или воспользуйтесь поиском по доступным картам.",
    },
  ];
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
          <span className="shadow-md uppercase text-accent text-[12px] rounded-full py-[4px] px-[12px] w-fit bg-bglogo border-[1.5px] border-accent/30">
            База знаний
          </span>
        </div>
        <div className="flex flex-col gap-[15px]">
          <h1 className="text-3xl sm:text-4xl md:text-5xl">
            Справка по работе с системой
          </h1>
          <p className="text-balance text-hero text-sm sm:text-base">
            Короткие инструкции по поиску объектов, работе со слоями и картами.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px]">
          <div className="shadow-md flex flex-col p-[20px] bg-white  border-[1px] border-grey/20 gap-[5px] rounded-[12px]">
            <span className="text-accent pb-[10px]">01</span>
            <span className="text-title text-[14px] sm:text-base">
              Выберите тематический раздел
            </span>
            <span className="text-footer text-[12px] sm:text-base ">
              На главной странице нажмите на карточку, чтобы увидеть список
              доступных карт. Выберите нужную карту и нажмите на неё.
            </span>
          </div>
          <div className="shadow-md flex flex-col p-[20px] bg-white  border-[1px] border-grey/20 gap-[5px] rounded-[12px]">
            <span className="text-accent pb-[10px]">02</span>
            <span className="text-title text-[14px] sm:text-base">
              Настройте отображение карты
            </span>
            <span className="text-footer text-[12px] sm:text-base">
              В боковой панели включайте и отключайте слои. Активные наборы
              данных сразу появятся на карте. Справа от кнопки слоя можно
              раскрыть условные обозначения нажатием на «+».
            </span>
          </div>
          <div className="shadow-md flex flex-col p-[20px] bg-white  border-[1px] border-grey/20 gap-[5px] rounded-[12px]">
            <span className="text-accent pb-[10px]">03</span>
            <span className="text-title text-[14px] sm:text-base">
              Найдите объект или используйте инструменты
            </span>
            <span className="text-footer text-[12px] sm:text-base">
              Используйте доступные инструменты для получения информации. Чтобы
              получить информацию об объекте, нажмите на него.
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-[15px]">
          <div className="flex flex-col gap-[10px]">
            {faqItems.map((item, index) => {
              const isOpen = openIndex === index;

              return (
                <div
                  key={item.question}
                  className="shadow-md border-[1px] border-grey/20 bg-white rounded-[15px] w-full"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="p-[15px] w-full text-[14px] sm:text-base flex justify-between items-center"
                  >
                    <span>{item.question}</span>
                    <span
                      className={`transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      ▾
                    </span>
                  </button>

                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-[15px] pb-[15px]">
                        <span className="text-[14px] sm:text-base text-footer">
                          {item.answer}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="shadow-md w-full flex flex-col gap-[8px] rounded-[15px] p-[15px] bg-accent">
            <span className="text-white">Не нашли ответ?</span>
            <span className="text-white/80">
              Опишите задачу — специалисты поддержки помогут разобраться.
            </span>
            <Link
              href="/main/support"
              className="text-accent bg-white flex justify-center py-[10px] rounded-[12px]"
            >
              Обратиться в поддержку
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
