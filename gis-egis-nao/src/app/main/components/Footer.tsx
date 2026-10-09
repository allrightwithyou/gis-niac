import Link from "next/link";
import Image from "next/image";
export default function Footer() {
  return (
    <footer className="py-[32px] px-[24px] bg-white flex justify-center border-t-[1.5px] border-margin">
      <div className="flex w-full max-w-[1400px] flex-row justify-between text-footer text-sm sm:text-base items-center ">
        <div className="flex gap-[10px] justify-center items-center">
          <Link href="https://adm-nao.ru/">
            <Image
              className="block "
              src="/brandbook.svg"
              alt="Логотип НАО"
              width={70}
              height={35}
            />
          </Link>
          © 2026 Администрация Ненецкого автономного округа
        </div>
        <Link
          href="/main/support"
          className="hover:text-accent transition-colors"
        >
          Поддержка
        </Link>
      </div>
    </footer>
  );
}
