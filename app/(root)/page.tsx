import { Collection } from "@/components/Collection";
import { navLinks } from "@/constants";
import { getUserImages } from "@/lib/actions/image";
import { getUserById } from "@/lib/actions/user";
import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home({ searchParams }: any) {
  const { page: sPage, searchQuery: searchQ } = await searchParams;
  const page = Number(sPage) || 1;
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");
  const user = await getUserById(clerkUser?.id as string);
  const images = await getUserImages({
    userId: user._id as string,
    page,
    limit: 6,
  });

  return (
    <main className="">
      <section className="home">
        <h1 className="home-heading text-background">
          Edit your photos with the Power of AI
        </h1>
        <ul className="flex  items-center justify-center w-full gap-20">
          {navLinks.slice(1, 5).map((link) => (
            <Link
              key={link.route}
              href={link.route}
              className="flex flex-col items-center justify-center gap-2"
            >
              <li className=" w-fit rounded-full bg-white p-4">
                <Image src={link.icon} alt="logo" width={24} height={24} />
              </li>
              <p className="p-14-medium text-center text-white">{link.label}</p>
            </Link>
          ))}
        </ul>
      </section>
      <section className="sm:mt-12">
        <Collection
          hasSearch={true}
          images={images}
          totalPages={images.totalPages as any}
          page={page}
        />
      </section>
    </main>
  );
}
