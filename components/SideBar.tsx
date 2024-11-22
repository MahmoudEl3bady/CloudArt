"use client";

import { navLinks } from "@/constants";
import { SignedOut, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";

const SideBar = () => {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  // Ensures that client-only code runs only on the client after initial render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;
  return (
    <aside className="sidebar">
      <div className="flex flex-col items-start gap-4 h-full">
        <Link href="/" className="sidebar-logo">
          <Image
            src="/assets/icons/cloudArt-logo.svg"
            alt="logo"
            width={180}
            height={28}
          />
        </Link>

        <nav className="sidebar-nav flex flex-col justify-between w-full">
          <ul className="sidebar-nav-elements flex flex-col items-start gap-2 w-full">
            {navLinks.slice(0, 6).map((link) => (
              <li
                key={link.route}
                className={`sidebar-nav-item flex gap-4 p-3 font-semibold text-[16px] leading-[140%] w-full rounded-full transition-colors ${
                  link.route === pathname
                    ? "bg-purple-gradient text-white"
                    : "text-gray-700 hover:bg-purple-100 hover:shadow-inner"
                }`}
              >
                <Link href={link.route} className="flex gap-4 items-center">
                  <Image
                    src={link.icon}
                    alt={link.label}
                    width={24}
                    height={24}
                    className={link.route === pathname ? "brightness-200" : ""}
                  />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <ul className="sidebar-nav-elements flex flex-col items-start gap-2 w-full">
            {navLinks.slice(6).map((link) => (
              <li
                key={link.route}
                className={`sidebar-nav-item flex gap-4 p-3 font-semibold text-[16px] leading-[140%] w-full rounded-full transition-colors ${
                  link.route === pathname
                    ? "bg-purple-gradient text-white"
                    : "text-gray-700 hover:bg-purple-100 hover:shadow-inner"
                }`}
              >
                <Link href={link.route} className="flex gap-4 items-center">
                  <Image
                    src={link.icon}
                    alt={link.label}
                    width={24}
                    height={24}
                    className={link.route === pathname ? "brightness-200" : ""}
                  />
                  {link.label}
                </Link>
              </li>
            ))}

            <li className="sidebar-nav-item flex items-center gap-2 p-4 cursor-pointer">
              <UserButton showName />
            </li>
          </ul>

          <SignedOut>
            <Button asChild className="button bg-purple-gradient bg-cover">
              <Link href="/sign-in">Login</Link>
            </Button>
          </SignedOut>
        </nav>
      </div>
    </aside>
  );
};

export default SideBar;
