import { Collection } from "@/components/Collection";
import { navLinks } from "@/constants";
import { getAllImages } from "@/lib/actions/image";
import Image from "next/image";
import Link from "next/link";

export default async function Home({searchParams}:any) {
  const {page : sPage,searchQuery :searchQ} = await searchParams;
  const page = Number(sPage) || 1;
  const searchQuery = (searchQ as string) || "";
  const images = await getAllImages();
  return (
    <main className="">
      <section className="home">
        <h1 className="home-heading">
          Lorem, ipsum dolor sit amet consectetur adipisicing elit!
        </h1>
        <ul className="flex-center w-full gap-20">
          {navLinks.slice(1, 5).map((link) => (
            <Link key={link.route} href={link.route}>
              <li className="flex-center w-fit rounded-full bg-white p-4">
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
          // totalPages={images}
          page={page}
        />
      </section>
    </main>
  );
}
