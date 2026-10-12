export type NewsItem = {
  id: number;
  category: string;
  date: string;
  title: string;
};

export function parseNewsFile(text: string): NewsItem[] {
 
  return text
    .split(/\r?\n/)
    .map((line, index) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split("|").map((part) => part.trim());

      if (parts.length !== 3) {
        throw new Error(`Неверный формат строки ${index + 1}: ${line}`);
      }

      const [category, date, title] = parts;

      return {
        id: index + 1,
        category,
        date,
        title,
      };
    });
}