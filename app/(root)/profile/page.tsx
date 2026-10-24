import { Collection } from "@/components/Collection";
import { getUserImages } from "@/lib/data/images";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ImagesResponse } from "@/types";

const emptyImages: ImagesResponse = { data: [], totalPages: 0 };

const Profile = async () => {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  const page = 1;
  const result = await getUserImages({ page });
  const images = result.ok ? result.data : emptyImages;
  return (
    <div>
      <h1 className="text-bold text-3xl text-[#ededed]">Profile Page</h1>
      <section>
        <Collection hasSearch={true} images={images} totalPages={images.totalPages} page={page} />
      </section>
    </div>
  );
};

export default Profile;
