import { Collection, ImageType } from "@/components/Collection";
import { navLinks } from "@/constants";
import { getExampleImages, getUserImages } from "@/lib/actions/image";
import { getUserById } from "@/lib/actions/user";
import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home({ searchParams }: any) {
  const { page: sPage } = await searchParams;
  const page = Number(sPage) || 1;
  const clerkUser = await currentUser();
  let images: ImagesResponse | undefined;
  let user;

  if (clerkUser) {
    user = await getUserById(clerkUser?.id as string);
    images = (await getUserImages({
      userId: user._id as string,
      page,
      limit: 6,
    })) as ImagesResponse;
  } else {
    images = (await getExampleImages()) as any;
  }

  return (
    <main>
      {/* Hero Section */}
      <section className="home">
        <h1 className="home-heading text-background">
          Edit your photos with the Power of AI
        </h1>
        <ul className="flex items-center justify-center w-full gap-20">
          {navLinks.slice(1, 5).map((link) => (
            <Link
              key={link.route}
              href={
                clerkUser
                  ? link.route
                  : `/transforms/trial/${link.route.split("/").pop()}`
              }
              className="flex flex-col items-center justify-center gap-2"
            >
              <li className="w-fit rounded-full bg-white p-4 hover:scale-110 transition-transform">
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
      {!clerkUser && (
        <section className="mt-12 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 p-8 border-2 border-purple-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                🎨 Try CloudArt Free - No Sign Up Required!
              </h2>
              <p className="text-gray-600 mb-4">
                Experience AI-powered image editing instantly. Upload an image
                and try any transformation.
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
              <div className="bg-white rounded-lg p-3 shadow-md">
                <p className="text-sm text-gray-600">✓ No credit card</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-md">
                <p className="text-sm text-gray-600">✓ Instant access</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-md">
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
      {!clerkUser && (
        <section className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navLinks.slice(1, 6).map((feature) => (
            <Link
              key={feature.route}
              href={`/transforms/trial/${feature.route.split("/").pop()}`}
              className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-purple-400"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-colors">
                  <Image
                    src={feature.icon}
                    alt={feature.label}
                    width={24}
                    height={24}
                  />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {feature.label}
                </h3>
              </div>
              <p className="text-gray-600 text-sm">
                {feature.label === "Image Restore" &&
                  "Remove noise and enhance image quality with AI"}
                {feature.label === "Generative Fill" &&
                  "Expand your images using AI outpainting"}
                {feature.label === "Object Remove" &&
                  "Seamlessly remove unwanted objects"}
                {feature.label === "Object Recolor" &&
                  "Change colors of specific objects"}
                {feature.label === "Background Remove" &&
                  "Remove backgrounds with precision"}
              </p>
              <div className="mt-4 text-purple-600 font-medium group-hover:translate-x-2 transition-transform inline-flex items-center gap-2">
                Try it now →
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
