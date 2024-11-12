import { Collection } from "@/components/Collection";
import { getUserImages } from "@/lib/actions/image";
import { getUserById } from "@/lib/actions/user";
import { currentUser } from "@clerk/nextjs/server";

const Profile = async () => {
  const clerkUser = await currentUser();
  const page = 1;
  const user = await getUserById(clerkUser?.id as string);
  const images = await getUserImages({ userId: user._id as string, page });
  return (
    <div>
      <h1 className="text-[#ededed] text-3xl text-bold">Profile Page</h1>
      <section>
        <Collection
          hasSearch={true}
          images={images}
          totalPages={images.totalPages as number}
          page={page}
        />
      </section>
    </div>
  );
};

export default Profile;
