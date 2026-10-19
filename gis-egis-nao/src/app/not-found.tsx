import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-bgpage p-4">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-6 rounded-[20px] border-[2px] border-margin bg-white p-8 text-center shadow">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-profile text-2xl font-bold text-gray-900">
          404
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-gray-900">
            Страница не найдена
          </h1>

          <p className="text-sm text-gray-400">
            Возможно, страница была перемещена, удалена или указан неверный
            адрес.
          </p>
        </div>

        <Link
          href="/"
          className="w-full rounded-[12px] border-[1.5px] border-accent bg-accent px-[12px] py-[12px] text-sm font-bold text-white shadow transition-colors hover:bg-accent/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Вернуться на главную
        </Link>
      </div>
    </main>
  );
}