import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { aspectRatioOptions } from "@/constants";
import * as qs from "qs";
import type { FormUrlQueryParams, RemoveUrlQueryParams } from "@/types";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ERROR HANDLER
export const handleError = (error: unknown) => {
  console.error(error);
};

// PLACEHOLDER LOADER - while image is transforming
const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#7986AC" offset="20%" />
      <stop stop-color="#68769e" offset="50%" />
      <stop stop-color="#7986AC" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#7986AC" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

const toBase64 = (str: string) =>
  typeof window === "undefined" ? Buffer.from(str).toString("base64") : window.btoa(str);

export const dataUrl = `data:image/svg+xml;base64,${toBase64(shimmer(1000, 1000))}`;
// ==== End

// FORM URL QUERY
export const formUrlQuery = ({ searchParams, key, value }: FormUrlQueryParams) => {
  const params = { ...qs.parse(searchParams.toString()), [key]: value };

  return `${window.location.pathname}?${qs.stringify(params, {
    skipNulls: true,
  })}`;
};

// REMOVE KEY FROM QUERY
export function removeKeysFromQuery({ searchParams, keysToRemove }: RemoveUrlQueryParams) {
  const currentUrl = qs.parse(searchParams);

  keysToRemove.forEach((key) => {
    delete currentUrl[key];
  });

  // Remove null or undefined values
  Object.keys(currentUrl).forEach((key) => currentUrl[key] == null && delete currentUrl[key]);

  return `${window.location.pathname}?${qs.stringify(currentUrl)}`;
}

// DEBOUNCE
export const debounce = <T extends unknown[]>(func: (...args: T) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout | null;
  return (...args: T) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// GE IMAGE SIZE
export type AspectRatioKey = keyof typeof aspectRatioOptions;
export const getImageSize = (
  type: string,
  image: { aspectRatio?: string; width?: number; height?: number } | null,
  dimension: "width" | "height",
): number => {
  if (type === "fill") {
    return aspectRatioOptions[image?.aspectRatio as AspectRatioKey]?.[dimension] || 1000;
  }
  return image?.[dimension] || 1000;
};

// DOWNLOAD IMAGE
export const download = (url: string, filename: string) => {
  if (!url) {
    throw new Error("Resource URL not provided! You need to provide one");
  }

  fetch(url)
    .then((response) => response.blob())
    .then((blob) => {
      const blobURL = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobURL;

      if (filename && filename.length) a.download = `${filename.replace(" ", "_")}.png`;
      document.body.appendChild(a);
      a.click();
    })
    .catch((error) => console.error({ error }));
};

// DEEP MERGE OBJECTS
export const deepMergeObjects = <T extends object>(
  obj1: T | null | undefined,
  obj2: T | null | undefined,
): T | null => {
  if (obj2 === null || obj2 === undefined) {
    return obj1 ?? null;
  }

  const output = { ...obj2 } as Record<string, unknown>;

  for (const key of Object.keys(obj1 ?? {})) {
    const value1: unknown = obj1?.[key as keyof T];
    const value2: unknown = obj2[key as keyof T];
    if (value1 && typeof value1 === "object" && value2 && typeof value2 === "object") {
      output[key] = deepMergeObjects(
        value1 as Record<string, unknown>,
        value2 as Record<string, unknown>,
      );
    } else {
      output[key] = value1;
    }
  }

  return output as T;
};
