"use client";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { navLinks } from "@/constants";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";

const MobileNav = () => {
  const pathname = usePathname();

  return (
    <header className="header">
      <Link href="/" className="pt-10">
        <Image
          src="/assets/icons/cloudArt-logo.svg"
          alt="logo"
          width={180}
          height={28}
          priority
        />
      </Link>
      <nav className="flex gap-2">
        <SignedIn>
          <UserButton  />
          <Sheet>
            <SheetTrigger aria-label="Open menu">
              <Image
                src="/assets/icons/menu.svg"
                width={34}
                height={34}
                className="cursor-pointer"
                alt="menu"
              />
            </SheetTrigger>
            <SheetContent className="sheet-content sm:w-64" side="right">
              <SheetTitle className="text-left">
                <Image
                  src="/assets/icons/cloudArt-logo.svg"
                  alt="logo"
                  width={180}
                  height={28}
                  priority
                />
              </SheetTitle>
              <nav>
                <ul className="mt-6 space-y-2">
                  {navLinks.map((link) => {
                    const isActive = link.route === pathname;

                    return (
                      <li key={link.route}>
                        <Link
                          className={`flex items-center gap-4 p-3 font-semibold text-[16px] leading-[140%] transition-colors
                            ${
                              isActive
                                ? "text-blue-400"
                                : "text-slate-400 hover:text-purple-600"
                            }`}
                          href={link.route}
                        >
                          <Image
                            src={link.icon}
                            alt=""
                            width={24}
                            height={24}
                            className={isActive ? "brightness-200" : ""}
                          />
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        </SignedIn>
        <SignedOut>
          <Button asChild className="button bg-purple-gradient bg-cover">
            <Link href="/sign-in">Login</Link>
          </Button>
        </SignedOut>
      </nav>
    </header>
  );
};

export default MobileNav;
