import Header from "@/components/Header";
import { transformationTypes } from "@/constants";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import TrialTransformForm from "@/components/TrialTransformForm";

type TransformationTypeKey = keyof typeof transformationTypes;

interface PageProps {
  type: TransformationTypeKey;
}

const TrialTransformationsType = async ({ params }: { params: any }) => {
  const { type } = (await params) as PageProps;
  const transformation = transformationTypes[type];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Trial Mode Banner */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">🎨 Trial Mode</h3>
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

      <Header
        title={transformation?.title}
        subtitle={transformation?.subTitle}
      />

      <TrialTransformForm
        action="Trial"
        type={transformation.type as TransformationTypeKey}
      />

      {/* Feature Limitations Notice */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">
          Trial Limitations:
        </h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Images are not saved permanently</li>
          <li>• Download quality limited to standard resolution</li>
          <li>• Sign up to unlock unlimited transformations and storage</li>
        </ul>
      </div>
    </div>
  );
};

export default TrialTransformationsType;
