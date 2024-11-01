import Header from "@/components/Header";
import React from "react";
import { transformationTypes } from "@/constants";
import TransformsForm from "@/components/TransformsForm";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/lib/actions/user";
import { redirect } from "next/navigation";

const AddTransformationsType =  async({ params }: SearchParamProps) => {
  const {type}  =  await params;
  const {userId} = await auth();
  if(!userId){
    redirect("/sign-in")
  }
  const user = await getUserById(userId);
  const transformation = transformationTypes[type];
  return (
    <>
      <Header
        title={transformation?.title}
        subtitle={transformation?.subTitle}
      />
      <TransformsForm  action="Add" type={transformation.type as TransformationTypeKey} userId={user.clerkId} />
    </>
  );
};

export default AddTransformationsType;
