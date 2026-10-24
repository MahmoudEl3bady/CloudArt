import Header from "@/components/Header";
import TransformsForm from "@/components/TransformsForm";
import { DeleteConfirmation } from "@/components/DeleteConfirmation";
import { getImageById } from "@/lib/data/images";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

const UpdateImagePage = async ({ params }: PageProps) => {
  const { id } = await params;
  const { userId } = await auth();

  const result = await getImageById(id, userId);
  // Owner-only: guests, foreign viewers and private foreign images are
  // indistinguishable from a missing image.
  if (!result || !result.isOwner) {
    notFound();
  }
  const { image } = result;

  return (
    <>
      <Header title="Update Image" subtitle="Fine-tune your transformation" />
      <TransformsForm
        action="Update"
        type={image.transformationType}
        data={image}
        config={image.config ?? null}
      />
      <div className="mt-8 flex justify-center">
        <DeleteConfirmation imageId={image._id} />
      </div>
    </>
  );
};

export default UpdateImagePage;
