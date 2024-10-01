import MobileNav from "@/components/MobileNav";
import SideBar from "@/components/SideBar";
import { ReactNode } from "react";

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <main className="root">
      <SideBar />
      <MobileNav />
      <div className="root-container">
        <div className="wrapper">
          {children}
        </div>
      </div>
    </main>
  );
};

export default RootLayout;
