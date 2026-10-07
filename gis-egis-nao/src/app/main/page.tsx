import Hero from "@/app/main/components/Hero";
import { getWebMaps } from "@/app/lib/ngw";
import type { WebMap } from "@/app/main/components/Card";

export default async function MainPage() {
  let webMaps: WebMap[] = [];

  try {
    webMaps = await getWebMaps();
  } catch (error) {
    console.error("getWebMaps failed:", error);
  }

  return (
    <div className="">
      <div className="bg-white py-[80px]">
        <Hero webMaps={webMaps} />
      </div>
    </div>
  );
}