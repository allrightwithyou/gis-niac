import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
