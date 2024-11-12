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
      <div className="flex size-full items-start flex-col gap-4">
        <Link href="/" className="sidebar-logo">
          <Image
            src="/assets/images/logo-text.svg"
            alt="logo"
            width={180}
            height={28}
          />
        </Link>

        <nav className="sidebar-nav">
          {/* <SignedIn> */}
          <ul className="sidebar-nav_elements ">
            {navLinks.slice(0, 6).map((link) => {
              const isActive = link.route === pathname;

              return (
                <li
                  key={link.route}
                  className={`sidebar-nav_element group ${
                    isActive ? "bg-purple-gradient text-white" : "text-gray-700"
                  }`}
                >
                  <Link
                    className="flex  gap-4 p-3 font-semibold  text-[16px] leading-[140%]"
                    href={link.route}
                  >
                    <Image
                      src={link.icon}
                      alt="logo"
                      width={24}
                      height={24}
                      className={`${isActive && "brightness-200"}`}
                    />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <ul className="sidebar-nav_elements">
            {navLinks.slice(6).map((link) => {
              const isActive = link.route === pathname;

              return (
                <li
                  key={link.route}
                  className={`sidebar-nav_element group ${
                    isActive ? "bg-purple-gradient text-white" : "text-gray-700"
                  }`}
                >
                  <Link
                    className="flex  gap-4 p-3 font-semibold  text-[16px] leading-[140%]"
                    href={link.route}
                  >
                    <Image
                      src={link.icon}
                      alt="logo"
                      width={24}
                      height={24}
                      className={`${isActive && "brightness-200"}`}
                    />
                    {link.label}
                  </Link>
                </li>
              );
            })}

            <li className="flex-center cursor-pointer gap-2 p-4">
              <UserButton showName />
            </li>
          </ul>
          {/* </SignedIn> */}

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

