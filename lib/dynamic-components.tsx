import dynamic from "next/dynamic";

export const DynamicMediaUploader = dynamic(() => import("@/components/MediaUploader"), {
  loading: () => <div className="h-72 animate-pulse rounded-lg bg-gray-200" />,
  ssr: false,
});

export const DynamicTransformedImage = dynamic(() => import("@/components/TransformedImage"), {
  loading: () => <div className="h-72 animate-pulse rounded-lg bg-gray-200" />,
  ssr: false,
});
