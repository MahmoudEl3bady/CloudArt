import Header from "@/components/Header";
import React from "react";
import { transformationTypes } from "@/constants";
import TransformsForm from "@/components/TransformsForm";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

type TransformationTypeKey = keyof typeof transformationTypes;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(transformationTypes).map((type) => ({ type }));
}

type PageProps = {
  params: Promise<{ type: string }>;
};

const AddTransformationsType = async ({ params }: PageProps) => {
  const { type } = await params;
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  // The route segment is user-controlled; narrow the string to a known key.
  const transformation = transformationTypes[type as TransformationTypeKey];
  if (!transformation) {
    notFound();
  }
  return (
    <>
      <Header title={transformation.title} subtitle={transformation.subTitle} />
      <TransformsForm
        action="Add"
        type={transformation.type as TransformationTypeKey}
        userId={userId}
      />
    </>
  );
};

export default AddTransformationsType;
