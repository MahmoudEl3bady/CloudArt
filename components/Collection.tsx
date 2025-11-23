"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { CldImage } from "next-cloudinary";
import { transformationTypes } from "@/constants";
import { formUrlQuery } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import { Search } from "./Search";
import { useMemo } from "react";

type TransformationTypeKey = keyof typeof transformationTypes;

interface ImageType {
  _id: string;
  title: string;
  transformationType: TransformationTypeKey;
  secureURL: string;
  width: number;
  height: number;
  config: Record<string, any>;
}

interface CollectionProps {
  hasSearch?: boolean;
  images:
    | {
        data: ImageType[];
        totalPages?: number;
      }
    | undefined;
  totalPages?: number;
  page: number;
}

export const Collection = ({
  hasSearch = false,
  images: initialImages,
  totalPages = 1,
  page,
}: CollectionProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("query") || "";

  const filteredImages = useMemo(() => {
    if (!initialImages?.data) return { data: [] };

    if (!query) return initialImages;

    const filtered = initialImages.data.filter((image) =>
      image.title.toLowerCase().includes(query.toLowerCase())
    );

    return {
      ...initialImages,
      data: filtered,
      totalPages: Math.ceil(filtered.length / 10),
    };
  }, [initialImages, query]);

  const onPageChange = (action: string) => {
    const pageValue = action === "next" ? Number(page) + 1 : Number(page) - 1;

    const newUrl = formUrlQuery({
      searchParams: searchParams.toString(),
      key: "page",
      value: pageValue,
    });

    router.push(newUrl, { scroll: false });
  };

  return (
    <>
      <div className="collection-heading">
        <h2 className="h2-bold text-primary">Recent Edits</h2>
        {hasSearch && <Search defaultValue="" />}
      </div>

      {filteredImages.data && filteredImages.data.length > 0 ? (
        <ul className="collection-list">
          {filteredImages.data.map((image) => (
            <Card image={image} key={image._id} />
          ))}
        </ul>
      ) : (
        <div className="collection-empty">
          <p className="p-20-semibold">No Recent Images</p>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination className="mt-10">
          <PaginationContent className="flex w-full">
            <Button
              disabled={Number(page) <= 1}
              className="collection-btn"
              onClick={() => onPageChange("prev")}
            >
              <PaginationPrevious className="hover:bg-transparent hover:text-white" />
            </Button>

            <p className="flex-center p-16-semibold w-fit flex-1 text-accent">
              {page} / {totalPages}
            </p>

            <Button
              className="button w-32 bg-purple-gradient bg-cover text-white"
              onClick={() => onPageChange("next")}
              disabled={Number(page) >= totalPages}
            >
              <PaginationNext className="hover:bg-transparent hover:text-white" />
            </Button>
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
};

interface CardProps {
  image: ImageType;
}
interface TransformationType {
  type: string;
  title: string;
  subTitle: string;
  config: Record<string, any>;
  icon: string;
}

const Card = ({ image }: CardProps) => {
  const transformationType = image.transformationType;
  const transformation = transformationTypes[
    transformationType
  ] as TransformationType;

  if (!transformation || !transformation.icon) {
    console.error(`Invalid transformation type: ${transformationType}`);
    return null;
  }

  return (
    <li>
      <Link href={`/transforms/${image._id}`} className="collection-card">
        <CldImage
          src={image.secureURL}
          alt={image.title}
          width={image.width}
          height={image.height}
          {...image.config}
          loading="lazy"
          className="h-52 w-full rounded-[10px] object-cover"
          sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
        />
        <div className="flex-between">
          <p className="p-20-semibold mr-3 line-clamp-1 text-blue-400">
            {image.title}
          </p>
          <Image
            src={`/assets/icons/${transformation.icon}`}
            alt={image.title}
            width={24}
            height={24}
          />
        </div>
      </Link>
    </li>
  );
};
