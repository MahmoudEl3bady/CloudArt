import dynamic from "next/dynamic";

export const DynamicMediaUploader = dynamic(
  () => import("@/components/MediaUploader"),
  {
    loading: () => (
      <div className="animate-pulse bg-gray-200 h-72 rounded-lg" />
    ),
    ssr: false,
  }
);

export const DynamicTransformedImage = dynamic(
  () => import("@/components/TransformedImage"),
  {
    loading: () => (
      <div className="animate-pulse bg-gray-200 h-72 rounded-lg" />
    ),
    ssr: false,
  }
);
