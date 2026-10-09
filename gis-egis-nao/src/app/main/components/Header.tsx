import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="text-sm sm:text-base w-full bg-white/[98%] h-[64px] flex items-center border-b-[1.5px] border-margin">
      <div className="px-[24px] flex w-full max-w-[1400px] mx-auto gap-[32px]">
        <div className="gap-[32px] flex w-full">
          <div className="gap-[12px] flex ">
            <Link
              className="shadow-md p-[2px]  bg-bglogo border-[1.5px] border-accent/30 rounded-[8px] hover:border-accent transition-all"
              href="https://ниац.рф/"
            >
              <Image
                className="block"
                src="/niac_logo.svg"
                alt="Логотип НИАЦ"
                width={32}
                height={32}
              />
            </Link>
            <div className="flex items-center justify-center">
              <Link
                className="text-black hover:text-accent transition-colors"
                href="/main"
              >
                ГИС ЕГИС НАО
              </Link>
            </div>
          </div>
          <nav className="text-grey gap-[24px] flex flex-1 items-center ">
            <Link
              href="/main/news"
              className="hover:text-accent transition-colors"
            >
              Новости
            </Link>
            <Link
              href="/main/help"
              className="hover:text-accent transition-colors"
            >
              Справка
            </Link>
            <Link
              href="/main/system"
              className="hover:text-accent transition-colors"
            >
              О системе
            </Link>
          </nav>
        </div>
        <div>
          <Link className="hidden" href="https://adm-nao.ru/">
            <svg
              className="block border-grey/20 stroke-grey bg-profile flex justify-center rounded-md  border-[1px] box-sizing transition-all hover:fill-accent hover:border-accent"
              aria-label="Профиль"
              fill="none"
              width={37}
              height={37}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M24 24.75V23.25C24 22.4544 23.6839 21.6913 23.1213 21.1287C22.5587 20.5661 21.7956 20.25 21 20.25H15C14.2044 20.25 13.4413 20.5661 12.8787 21.1287C12.3161 21.6913 12 22.4544 12 23.25V24.75"
                strokeWidth="1.125"
                strokeLinecap="round"
                className="opacity-30"
              />
              <path
                d="M18 17.25C19.6569 17.25 21 15.9069 21 14.25C21 12.5931 19.6569 11.25 18 11.25C16.3431 11.25 15 12.5931 15 14.25C15 15.9069 16.3431 17.25 18 17.25Z"
                strokeWidth="1.125"
                className="opacity-30"
              />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
