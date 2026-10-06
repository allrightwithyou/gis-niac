import Header from "@/app/main/components/Header";
import Footer from "@/app/main/components/Footer";
import type { ReactNode } from "react";
interface MainLayoutProps {
  children: ReactNode;
}

export default function MainPageLayout({ children }: MainLayoutProps) {
  return (
    <div>
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
