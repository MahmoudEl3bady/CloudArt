import Header from "@/components/Header";
import { transformationTypes } from "@/constants";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import TrialTransformForm from "@/components/TrialTransformForm";

type TransformationTypeKey = keyof typeof transformationTypes;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(transformationTypes).map((type) => ({ type }));
}

type PageProps = {
  params: Promise<{ type: string }>;
};

const TrialTransformationsType = async ({ params }: PageProps) => {
  const { type } = await params;
  // The route segment is user-controlled; narrow the string to a known key.
  const transformation = transformationTypes[type as TransformationTypeKey];
  if (!transformation) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Trial Mode Banner */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">🎨 Trial Mode</h3>
            <p className="text-sm text-blue-100">
              You're trying CloudArt for free! Sign up to save your edits.
            </p>
          </div>
          <Button
            asChild
            variant="secondary"
            className="bg-white text-purple-600 hover:bg-gray-100"
          >
            <Link href="/sign-up">Sign Up Now</Link>
          </Button>
        </div>
      </div>

      <Header title={transformation?.title} subtitle={transformation?.subTitle} />

      <TrialTransformForm action="Trial" type={transformation.type as TransformationTypeKey} />

      {/* Feature Limitations Notice */}
      <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <h4 className="mb-2 font-semibold text-yellow-800">Trial Limitations:</h4>
        <ul className="space-y-1 text-sm text-yellow-700">
          <li>• Images are not saved permanently</li>
          <li>• Download quality limited to standard resolution</li>
          <li>• Sign up to unlock unlimited transformations and storage</li>
        </ul>
      </div>
    </div>
  );
};

export default TrialTransformationsType;
