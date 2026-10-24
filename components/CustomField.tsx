import React from "react";
import type { Control, ControllerRenderProps } from "react-hook-form";
import type { z } from "zod";

import { FormField, FormItem, FormControl, FormMessage, FormLabel } from "./ui/form";

import type { imageFormSchema } from "@/lib/validation/image";

type CustomFieldProps = {
  control: Control<z.infer<typeof imageFormSchema>> | undefined;
  render: (props: {
    field: ControllerRenderProps<z.infer<typeof imageFormSchema>>;
  }) => React.ReactNode;
  name: keyof z.infer<typeof imageFormSchema>;
  formLabel?: string;
  className?: string;
};

export const CustomField = ({ control, render, name, formLabel, className }: CustomFieldProps) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {formLabel && <FormLabel>{formLabel}</FormLabel>}
          <FormControl>{render({ field })}</FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
