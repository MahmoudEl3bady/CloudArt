import { Collection } from "@/components/Collection";
import { navLinks } from "@/constants";
import { getExampleImages, getUserImages } from "@/lib/data/images";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ImagesResponse } from "@/types";

type HomeProps = {
  searchParams: Promise<{ page?: string }>;
};

const emptyImages: ImagesResponse = { data: [], totalPages: 0 };

export default async function Home({ searchParams }: HomeProps) {
  const { page: sPage } = await searchParams;
  const page = Number(sPage) || 1;
  const { userId } = await auth();

  let images: ImagesResponse;
  if (userId) {
    const result = await getUserImages({ page, limit: 6 });
    images = result.ok ? result.data : emptyImages;
  } else {
    const result = await getExampleImages();
    images = result.ok ? result.data : emptyImages;
  }

  return (
    <main>
      {/* Hero Section */}
      <section className="home">
        <h1 className="home-heading text-background">Edit your photos with the Power of AI</h1>
        <ul className="flex w-full items-center justify-center gap-20">
          {navLinks.slice(1, 5).map((link) => (
            <Link
              key={link.route}
              href={userId ? link.route : `/transforms/trial/${link.route.split("/").pop()}`}
              className="flex flex-col items-center justify-center gap-2"
            >
              <li className="w-fit rounded-full bg-white p-4 transition-transform hover:scale-110">
                <Image
                  src={link.icon}
                  priority={true}
                  loading="eager"
                  alt="logo"
                  width={24}
                  height={24}
                />
              </li>
              <p className="p-14-medium text-center text-white">{link.label}</p>
            </Link>
          ))}
        </ul>
      </section>

      {/* Guest Trial Section */}
      {!userId && (
        <section className="mt-12 rounded-2xl border-2 border-purple-200 bg-gradient-to-r from-blue-50 to-purple-50 p-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex-1">
              <h2 className="mb-2 text-2xl font-bold text-gray-800">
                🎨 Try CloudArt Free - No Sign Up Required!
              </h2>
              <p className="mb-4 text-gray-600">
                Experience AI-powered image editing instantly. Upload an image and try any
                transformation.
              </p>
              <div className="flex gap-3">
                <Button asChild className="bg-purple-600 hover:bg-purple-700">
                  <Link href="/transforms/trial/restore">Start Free Trial</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/sign-up">Sign Up for Full Access</Link>
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="rounded-lg bg-white p-3 shadow-md">
                <p className="text-sm text-gray-600">✓ No credit card</p>
              </div>
              <div className="rounded-lg bg-white p-3 shadow-md">
                <p className="text-sm text-gray-600">✓ Instant access</p>
              </div>
              <div className="rounded-lg bg-white p-3 shadow-md">
                <p className="text-sm text-gray-600">✓ All features</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* User Collection */}
      {images && (
        <section className="sm:mt-12">
          <Collection
            hasSearch={true}
            images={images}
            totalPages={images?.totalPages}
            page={page}
          />
        </section>
      )}

      {/* Features Showcase for Guests */}
      {!userId && (
        <section className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {navLinks.slice(1, 6).map((feature) => (
            <Link
              key={feature.route}
              href={`/transforms/trial/${feature.route.split("/").pop()}`}
              className="group relative overflow-hidden rounded-2xl border-2 border-transparent bg-white p-6 shadow-lg transition-all hover:border-purple-400 hover:shadow-2xl"
            >
              <div className="mb-4 flex items-center gap-4">
                <div className="rounded-full bg-purple-100 p-3 transition-colors group-hover:bg-purple-200">
                  <Image src={feature.icon} alt={feature.label} width={24} height={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">{feature.label}</h3>
              </div>
              <p className="text-sm text-gray-600">
                {feature.label === "Image Restore" &&
                  "Remove noise and enhance image quality with AI"}
                {feature.label === "Generative Fill" && "Expand your images using AI outpainting"}
                {feature.label === "Object Remove" && "Seamlessly remove unwanted objects"}
                {feature.label === "Object Recolor" && "Change colors of specific objects"}
                {feature.label === "Background Remove" && "Remove backgrounds with precision"}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 font-medium text-purple-600 transition-transform group-hover:translate-x-2">
                Try it now →
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
