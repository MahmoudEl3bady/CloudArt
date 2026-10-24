import type { Dispatch, SetStateAction } from "react";

// ====== USER PARAMS
export type CreateUserParams = {
  clerkId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  photo: string;
};

export type UpdateUserParams = {
  firstName: string;
  lastName: string;
  username?: string;
  photo: string;
};

// Server-side user shape returned by lib/data. Deliberately excludes email
// and any other private field (S-07).
export type UserDTO = {
  _id: string;
  clerkId: string;
  firstName: string;
  lastName: string;
  username?: string;
};

// ====== ACTION / DATA RESULTS
export type ActionError =
  "UNAUTHENTICATED" | "INVALID_INPUT" | "NOT_FOUND" | "RATE_LIMITED" | "SERVER_ERROR";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };

// ====== IMAGE PARAMS
// Field optionality mirrors what the transformation forms can actually
// produce (values come from image?.x before an upload/transform happens)
// and the Mongoose schema in db/models/image.model.ts.
export type AddImageParams = {
  image: {
    title: string;
    publicId?: string;
    transformationType: string;
    width?: number;
    height?: number;
    config: Transformations | null;
    secureURL?: string;
    transformationURL?: string;
    aspectRatio: string | undefined;
    prompt: string | undefined;
    color: string | undefined;
  };
  userId: string;
  path: string;
};

export type UpdateImageParams = {
  image: {
    _id: string;
    title: string;
    publicId?: string;
    transformationType: string;
    width?: number;
    height?: number;
    config: Transformations | null;
    secureURL?: string;
    transformationURL?: string;
    aspectRatio: string | undefined;
    prompt: string | undefined;
    color: string | undefined;
  };
  userId: string;
  path: string;
};

// Shape of an image document as served to pages/components: the lean doc
// mapped by toImageDTO in lib/data/images.ts (see db/models/image.model.ts).
export type IImage = {
  _id: string;
  title: string;
  transformationType: TransformationTypeKey;
  secureURL: string;
  width: number;
  height: number;
  publicId?: string;
  aspectRatio?: string;
  config?: Transformations;
  transformationURL?: string;
  color?: string;
  prompt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Transformations = {
  restore?: boolean;
  fillBackground?: boolean;
  remove?: {
    prompt: string;
    removeShadow?: boolean;
    multiple?: boolean;
  };
  recolor?: {
    prompt?: string;
    to: string;
    multiple?: boolean;
  };
  removeBackground?: boolean;
};

export type TransformationTypeKey = "restore" | "fill" | "remove" | "recolor" | "removeBackground";

// ====== URL QUERY PARAMS
export type FormUrlQueryParams = {
  searchParams: string;
  key: string;
  value: string | number | null;
};

export type RemoveUrlQueryParams = {
  searchParams: string;
  keysToRemove: string[];
};

export type ImagesResponse = {
  data: IImage[];
  totalPages: number;
};

export type TransformationFormProps = {
  action: "Add" | "Update";
  userId: string;
  type: TransformationTypeKey;
  creditBalance?: number;
  data?: IImage | null;
  config?: Transformations | null;
};

export type TransformedImageProps = {
  image: Partial<IImage> | null;
  type: string;
  title: string;
  transformationConfig: Transformations | null;
  isTransforming: boolean;
  hasDownload?: boolean;
  setIsTransforming?: Dispatch<SetStateAction<boolean>>;
};
