import Image from "next/image";
import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="justify-center flex px-[24px] py-[40px]">
      <div className="max-w-[1400px] w-full flex flex-col gap-[34px]">
        <Link href="/main/" className="flex gap-[6px] pr-[12px] flex-row items-center border-r-[1px] border-margin ">
          <Image
            className="block"
            src="/back.svg"
            alt="Назад"
            width={16}
            height={16}
          />{" "}
          <span className="text-hero hover:text-accent transition-colors text-[14px]">На главную</span>
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
            <span className="text-title text-[14px] sm:text-base">Выберите тематический раздел</span>
            <span className="text-footer text-[12px] sm:text-base ">
              На главной странице нажмите на карточку, чтобы увидеть список
              доступных карт. Выберите нужную карту и нажмите на неё.
            </span>
          </div>
          <div className="shadow-md flex flex-col p-[20px] bg-white  border-[1px] border-grey/20 gap-[5px] rounded-[12px]">
            <span className="text-accent pb-[10px]">02</span>
            <span className="text-title text-[14px] sm:text-base">Настройте отображение карты</span>
            <span className="text-footer text-[12px] sm:text-base">
              В боковой панели включайте и отключайте слои. Активные наборы
              данных сразу появятся на карте. Справа от кнопки слоя можно
              раскрыть нажатием на «+» условные обозначения.
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
          <h2 className="text-title text-[16px] sm:text-[22px]">Частые вопросы</h2>
          <div className="flex flex-col gap-[10px]">
            <button className="shadow-md border-[1px] p-[15px] w-full rounded-[15px] text-[14px] sm:text-base bg-white border-grey/20 flex">
              <span>Почему слой не отображается?</span>
            </button>
            <button className="shadow-md border-[1px] p-[15px] w-full rounded-[15px] text-[14px] sm:text-base bg-white border-grey/20 flex">
              <span>Как часто обновляются данные?</span>
            </button>
            <button className="shadow-md border-[1px] p-[15px] w-full rounded-[15px] text-[14px] sm:text-base bg-white border-grey/20 flex">
              <span>Что делать, если нет нужной карты?</span>
            </button>
          </div>
          <div className="shadow-md w-full flex flex-col gap-[8px] rounded-[15px] p-[15px] bg-accent">
            <Image />
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
