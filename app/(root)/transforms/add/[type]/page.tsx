import Header from "@/components/Header";
import React from "react";
import { transformationTypes } from "@/constants";
import TransformsForm from "@/components/TransformsForm";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/lib/actions/user";
import { redirect } from "next/navigation";

type TransformationTypeKey = keyof typeof transformationTypes;

type PageProps = {
  params: Promise<{ type: string }>;
};

const AddTransformationsType = async ({ params }: PageProps) => {
  const { type } = await params;
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  const user = await getUserById(userId);
  // The route segment is user-controlled; narrow the string to a known key.
  const transformation = transformationTypes[type as TransformationTypeKey];
  return (
    <>
      <Header title={transformation?.title} subtitle={transformation?.subTitle} />
      <TransformsForm
        action="Add"
        type={transformation.type as TransformationTypeKey}
        userId={user.clerkId}
      />
    </>
  );
};

export default AddTransformationsType;
