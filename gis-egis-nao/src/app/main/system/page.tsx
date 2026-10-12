import Image from "next/image";
import Link from "next/link";

export default function SystemPage() {
  const section = 12;

  const objectMap = "4500+";
  const layersMap = "200+";
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
            ЕГИС НАО
          </span>
        </div>
        <div className="flex flex-col gap-[15px]">
          <h1 className="text-3xl sm:text-4xl md:text-5xl">О системе</h1>
          <p className="text-balance text-hero text-sm sm:text-base">
            Единое цифровое пространство для хранения, анализа и публикации
            геоданных Ненецкого автономного округа.
          </p>
        </div>
        <div>
          <div className="shadow-xl gradient-dark-to-accent p-[40px] flex flex-col gap-[25px] rounded-[15px]">
            <span className="text-accent text-[10px] rounded-full py-[4px] px-[12px] w-fit bg-bglogo/10 border-[1.5px] border-accent/30">
              Цифровая платформа региона
            </span>
            <h2 className="text-white text-2xl sm:text-2xl md:text-3xl">
              Геоданные для развития <br></br> Арктического региона
            </h2>
            <p className="text-white/70 text-left text-[14px] max-w-[600px]">
              ЕГИС НАО объединяет отраслевую информацию на единой карте — от
              природных ресурсов и экологии до социальной инфраструктуры и
              гражданской защиты.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[20px] pt-[20px] ">
            <div className="shadow-md  text-hero flex flex-col bg-white p-[18px] rounded-[15px] border-[1.5px] border-black/20 items-start">
              <span className="text-title pt-[20px] text-[24px]">
                {section}
              </span>

              <span className="text-footer text-[12px]">
                отраслевых разделов
              </span>
            </div>

            <div className="shadow-md  text-hero flex flex-col bg-white p-[18px] rounded-[15px] border-[1.5px] border-black/20 items-start">
              <span className="text-title pt-[20px] text-[24px]">
                {objectMap}
              </span>

              <span className="text-footer text-[12px]">объектов</span>
            </div>

            <div className="shadow-md text-hero flex flex-col bg-white p-[18px] rounded-[15px] border-[1.5px] border-black/20 items-start">
              <span className="text-title pt-[20px] text-[24px]">
                {layersMap}
              </span>

              <span className="text-footer text-[12px]">слоёв данных</span>
            </div>

            <div className="shadow-md  text-hero flex flex-col bg-white p-[18px] rounded-[15px] border-[1.5px] border-black/20 items-start">
              <span className="text-title pt-[20px] text-[24px]">24/7</span>

              <span className="text-footer text-[12px]">доступ к системе</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-[16px]">
          <h3 className="text-title text-[18px]">Возможности платформы</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
            <div className="shadow-md border-[1.5px] border-black/20 flex gap-[10px] p-[20px] bg-white rounded-[15px]">
              <div className="text-accent  p-[8px] h-[36px] border-[1px] border-bglogo text-[14px] flex justify-center items-center text-center bg-bglogo rounded-[12px]">
                <span>01</span>
              </div>
              <div className="flex flex-col">
                <span className="text-title text-[16px]">Единый каталог</span>
                <span className="text-hero text-[12px]">
                  Централизованное хранение пространственных данных органов
                  власти и подведомственных организаций.
                </span>
              </div>
            </div>
            <div className="shadow-md border-[1.5px] border-black/20 flex gap-[10px] p-[20px] bg-white rounded-[15px]">
              <div className="text-accent  p-[8px] h-[36px] border-[1px] border-bglogo text-[14px] flex justify-center items-center text-center bg-bglogo rounded-[10px]">
                <span>02</span>
              </div>
              <div className="flex flex-col">
                <span className="text-title text-[16px]">Аналитика территорий</span>
                <span className="text-hero text-[12px]">
                  Сопоставление тематических слоев для принятия обоснованных управленческих решений.
                </span>
              </div>
            </div>
            <div className="shadow-md border-[1.5px] border-black/20 flex gap-[10px] p-[20px] bg-white rounded-[15px]">
              <div className="text-accent  p-[8px] h-[36px] border-[1px] border-bglogo text-[14px] flex justify-center items-center text-center bg-bglogo rounded-[12px]">
                <span>03</span>
              </div>
              <div className="flex flex-col">
                <span className="text-title text-[16px]">Открытые данные</span>
                <span className="text-hero text-[12px]">
                  Публикация доступных сведений для жителей, бизнеса, исследователей и проектных организаций.
                </span>
              </div>
            </div>
            <div className="shadow-md border-[1.5px] border-black/20 flex gap-[10px] p-[20px] bg-white rounded-[15px]">
              <div className="text-accent  p-[8px] h-[36px] border-[1px] border-bglogo text-[14px] flex justify-center items-center text-center bg-bglogo rounded-[12px]">
                <span>04</span>
              </div>
              <div className="flex flex-col">
                <span className="text-title text-[16px]">Межведомственный обмен</span>
                <span className="text-hero text-[12px]">
                  Актуальные сведения без дублирования запросов и разрозненных файловых архивов.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
