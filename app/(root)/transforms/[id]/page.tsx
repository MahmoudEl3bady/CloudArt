import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import Header from "@/components/Header";
import TransformedImage from "@/components/TransformedImage";
import { Button } from "@/components/ui/button";
import { getImageById } from "@/lib/data/images";
import { getImageSize } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }>;
};

const ImageDetails = async ({ params }: PageProps) => {
  const { userId } = await auth();
  const { id } = await params;
  const result = await getImageById(id, userId);
  if (!result) {
    notFound();
  }
  const { image, isOwner } = result;

  return (
    <>
      <Header title={image.title} />
      <section className="mt-5 flex flex-wrap gap-4">
        <div className="p-14-medium md:p-16-medium flex gap-2">
          <p className="text-dark-600">Transformation:</p>
          <p className="capitalize text-purple-400">{image.transformationType}</p>
        </div>

        {image.prompt && (
          <>
            <p className="hidden text-dark-400/50 md:block">&#x25CF;</p>
            <div className="p-14-medium md:p-16-medium flex gap-2">
              <p className="text-dark-600">Prompt:</p>
              <p className="capitalize text-purple-400">{image.prompt}</p>
            </div>
          </>
        )}

        {image.color && (
          <>
            <p className="hidden text-dark-400/50 md:block">&#x25CF;</p>
            <div className="p-14-medium md:p-16-medium flex gap-2">
              <p className="text-dark-600">Color:</p>
              <p className="capitalize text-purple-400">{image.color}</p>
            </div>
          </>
        )}

        {image.aspectRatio && (
          <>
            <p className="hidden text-dark-400/50 md:block">&#x25CF;</p>
            <div className="p-14-medium md:p-16-medium flex gap-2">
              <p className="text-dark-600">Aspect Ratio:</p>
              <p className="capitalize text-purple-400">{image.aspectRatio}</p>
            </div>
          </>
        )}
      </section>

      <section className="mt-10 border-t border-dark-400/15">
        <div className="transformation-grid">
          {/* MEDIA UPLOADER */}
          <div className="flex flex-col gap-4">
            <h3 className="h3-bold text-dark-600">Original</h3>

            <Image
              width={getImageSize(image.transformationType, image, "width")}
              height={getImageSize(image.transformationType, image, "height")}
              src={image.secureURL}
              alt="image"
              preload={true}
              fetchPriority="high"
              className="transformation-original_image"
            />
          </div>

          {/* TRANSFORMED IMAGE */}
          <TransformedImage
            image={image}
            type={image.transformationType}
            title={image.title}
            isTransforming={false}
            transformationConfig={image.config ?? null}
            hasDownload={true}
          />
        </div>

        {isOwner && image.publicId && (
          <div className="mt-4 space-y-4">
            <Button asChild type="button" className="submit-button capitalize">
              <Link href={`/transforms/${image._id}/update`}>Update Image</Link>
            </Button>
          </div>
        )}
      </section>
    </>
  );
};

export default ImageDetails;
