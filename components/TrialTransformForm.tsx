"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  aspectRatioOptions,
  defaultValues,
  transformationTypes,
} from "@/constants";
import { CustomField } from "./CustomField";
import { useEffect, useState, useCallback } from "react";
import { AspectRatioKey, debounce, deepMergeObjects } from "@/lib/utils";
import MediaUploader from "./MediaUploader";
import TransformedImage from "./TransformedImage";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Download, AlertCircle, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

export const formSchema = z.object({
  title: z.string(),
  aspectRatio: z.string().optional(),
  color: z.string().optional(),
  prompt: z.string().optional(),
  publicId: z.string(),
});

type TransformationTypeKey = keyof typeof transformationTypes;

interface TrialTransformFormProps {
  action: "Trial";
  type: TransformationTypeKey;
}

const TrialTransformForm = ({ action, type }: TrialTransformFormProps) => {
  const transformationType = transformationTypes[type];
  const [image, setImage] = useState<any>(null);
  const [newTransformation, setNewTransformation] =
    useState<Transformations | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformationConfig, setTransformationConfig] =
    useState<Transformations | null>(null);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...defaultValues,
      title: `Trial ${transformationType.title}`,
    },
  });

  const onSelectFieldHandler = (
    value: string,
    onChangeField: (value: string) => void
  ) => {
    const imageSize = aspectRatioOptions[value as AspectRatioKey];

    setImage((prevState: any) => ({
      ...prevState,
      aspectRatio: imageSize.aspectRatio,
      width: imageSize.width,
      height: imageSize.height,
    }));

    setNewTransformation(transformationType.config);
    return onChangeField(value);
  };

  const onInputChangeHandler = (
    fieldName: string,
    value: string,
    type: string,
    onChangeField: (value: string) => void
  ) => {
    debounce(() => {
      setNewTransformation((prevState: any) => ({
        ...prevState,
        [type]: {
          ...prevState?.[type],
          [fieldName === "prompt" ? "prompt" : "to"]: value,
        },
      }));
    }, 1000)();

    return onChangeField(value);
  };

  const onTransformHandler = useCallback(async () => {
    if (!image?.publicId) {
      toast({
        title: "Upload Required",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }

    setIsTransforming(true);

    try {
      setTransformationConfig(
        deepMergeObjects(newTransformation, transformationConfig)
      );
      setNewTransformation(null);

      toast({
        title: "Transformation Applied! ✨",
        description: "Your image has been transformed successfully",
        className: "success-toast",
      });

      // Show download prompt after successful transformation
      setTimeout(() => setShowDownloadPrompt(true), 1000);
    } catch (error) {
      toast({
        title: "Transformation Failed",
        description: "Please try again or sign up for better support",
        variant: "destructive",
      });
      setIsTransforming(false);
    }
  }, [image, newTransformation, transformationConfig, toast]);

  const handleTrialDownload = () => {
    toast({
      title: "Sign up to download! 🎨",
      description: (
        <div className="mt-2 space-y-2">
          <p>Create a free account to:</p>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>Download high-quality images</li>
            <li>Save your transformations</li>
            <li>Access unlimited edits</li>
          </ul>
        </div>
      ),
      duration: 5000,
    });
  };

  useEffect(() => {
    if (image && (type === "restore" || type === "removeBackground")) {
      setNewTransformation(transformationType.config);
    }
  }, [image, transformationType.config, type]);

  return (
    <div className="space-y-6">
      {/* Trial Info Banner */}
      <Alert className="border-blue-200 bg-blue-50">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Try it free!</strong> You're testing{" "}
          {transformationType.title} without signing up.
          <Link
            href="/sign-up"
            className="ml-2 underline font-semibold hover:text-blue-600"
          >
            Create account to save
          </Link>
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form className="space-y-8">
          {/* Title Field */}
          <CustomField
            control={form.control}
            name="title"
            formLabel="Image Title"
            className="w-full"
            render={({ field }) => (
              <Input
                {...field}
                className="input-field"
                placeholder="My edited image"
              />
            )}
          />

          {/* Aspect Ratio for Fill */}
          {type === "fill" && (
            <CustomField
              control={form.control}
              name="aspectRatio"
              formLabel="Aspect Ratio"
              className="w-full"
              render={({ field }) => (
                <Select
                  onValueChange={(value) =>
                    onSelectFieldHandler(value, field.onChange)
                  }
                  value={field.value}
                >
                  <SelectTrigger className="select-field">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(aspectRatioOptions).map((key) => (
                      <SelectItem key={key} value={key} className="select-item">
                        {aspectRatioOptions[key as AspectRatioKey].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}

          {/* Prompt Fields for Remove/Recolor */}
          {(type === "remove" || type === "recolor") && (
            <div className="prompt-field">
              <CustomField
                control={form.control}
                name="prompt"
                formLabel={
                  type === "remove" ? "Object to remove" : "Object to recolor"
                }
                className="w-full"
                render={({ field }) => (
                  <Input
                    value={field.value}
                    className="input-field"
                    placeholder={
                      type === "remove"
                        ? "e.g., person, car"
                        : "e.g., shirt, background"
                    }
                    onChange={(e) =>
                      onInputChangeHandler(
                        "prompt",
                        e.target.value,
                        type,
                        field.onChange
                      )
                    }
                  />
                )}
              />

              {type === "recolor" && (
                <CustomField
                  control={form.control}
                  name="color"
                  formLabel="Replacement Color"
                  className="w-full"
                  render={({ field }) => (
                    <Input
                      value={field.value}
                      className="input-field"
                      placeholder="e.g., blue, red, #FF5733"
                      onChange={(e) =>
                        onInputChangeHandler(
                          "color",
                          e.target.value,
                          "recolor",
                          field.onChange
                        )
                      }
                    />
                  )}
                />
              )}
            </div>
          )}

          {/* Image Upload and Preview */}
          <div className="media-uploader-field">
            <CustomField
              control={form.control}
              name="publicId"
              className="flex size-full flex-col"
              render={({ field }) => (
                <MediaUploader
                  onValueChange={field.onChange}
                  setImage={setImage}
                  publicId={field.value}
                  image={image}
                  type={type}
                />
              )}
            />

            <TransformedImage
              image={image}
              type={type}
              title={form.getValues().title}
              isTransforming={isTransforming}
              setIsTransforming={setIsTransforming}
              transformationConfig={transformationConfig}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            <Button
              type="button"
              className="submit-button capitalize"
              disabled={isTransforming || newTransformation === null || !image}
              onClick={onTransformHandler}
            >
              {isTransforming ? "Transforming..." : "Apply Transformation"}
            </Button>

            {showDownloadPrompt && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 flex items-center justify-between">
                  <span>Sign up to download your transformed image!</span>
                  <Button
                    asChild
                    size="sm"
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Link href="/sign-up">Sign Up Free</Link>
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleTrialDownload}
              disabled={!transformationConfig || isTransforming}
            >
              <Download className="mr-2 h-4 w-4" />
              Download (Sign up required)
            </Button>
          </div>
        </form>
      </Form>

      {/* Features Comparison */}
      <div className="mt-8 rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <h3 className="text-lg font-bold text-purple-900 mb-4">
          ✨ Upgrade to Full Access
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-700">Trial Mode</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ Try all transformations</li>
              <li>✗ Can't save images</li>
              <li>✗ Can't download</li>
              <li>✗ Limited to current session</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-purple-700">Free Account</h4>
            <ul className="text-sm text-purple-600 space-y-1">
              <li>✓ Save all transformations</li>
              <li>✓ Download high-quality images</li>
              <li>✓ Access history</li>
              <li>✓ Unlimited projects</li>
            </ul>
          </div>
        </div>
        <Button
          asChild
          className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
        >
          <Link href="/sign-up">Create Free Account →</Link>
        </Button>
      </div>

      {/* Help Section */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-2">
          How to use {transformationType.title}:
        </h4>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Upload an image using the upload area</li>
          {(type === "remove" || type === "recolor") && (
            <li>
              Enter the object you want to{" "}
              {type === "remove" ? "remove" : "recolor"}
            </li>
          )}
          {type === "recolor" && <li>Specify the replacement color</li>}
          {type === "fill" && <li>Select your desired aspect ratio</li>}
          <li>Click "Apply Transformation" to see the magic!</li>
          <li>Sign up to save and download your result</li>
        </ol>
      </div>
    </div>
  );
};

export default TrialTransformForm;
