import { dataUrl, debounce, getImageSize } from "@/lib/utils";
import { CldImage } from "next-cloudinary";
import { PlaceholderValue } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";

const TransformedImage = ({
  image,
  type,
  transformationConfig,
  isTransforming,
  setIsTransforming,
  hasDownload,
}: TransformedImageProps) => {
  //TODO: Implement download handler
  // const downLoadHandler = () => {};
  return (
    <div className="flex flex-col gap-4">
      <div className="flex-between">
        <h3 className="h3-bold text-dark-400">Transformed</h3>
        {hasDownload && (
          <button className="download-btn">
            Download
            <Image
              src="/assets/icons/download.svg"
              alt="download"
              width={24}
              height={24}
              className="pb-[6px]"
            />
          </button>
        )}
      </div>

      {image?.publicId && transformationConfig ? (
        <div className="relative">
          <CldImage
            width={getImageSize(type, image, "width")}
            height={getImageSize(type, image, "height")}
            src={image?.secureURL}
            alt={image.title}
            sizes={"(max-width: 767px) 100vw, 50vw"}
            placeholder={dataUrl as PlaceholderValue}
            className="transformed-image"
            onLoad={() => {
              setIsTransforming && setIsTransforming(false);
            }}
            onError={() => {
              debounce(() => {
                setIsTransforming && setIsTransforming(false);
              }, 8000)();
            }}
            {...transformationConfig}
          />

          {isTransforming && (
            <div className="">
              <Image
                src="/assets/icons/spinner.svg"
                width={50}
                height={50}
                alt="spinner"
              />
              <p className="text-white/80">Please wait...</p>
            </div>
          )}
        </div>
      ) : (
        <div className="">Transformed Image</div>
      )}
    </div>
  );
};

export default TransformedImage;