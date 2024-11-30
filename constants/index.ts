import { subscribe } from "diagnostics_channel";
import { config } from "process";

export const navLinks = [
  {
    label: "Home",
    route: "/",
    icon: "/assets/icons/home.svg",
  },
  {
    label: "Image Restore",
    route: "/transforms/add/restore",
    icon: "/assets/icons/image.svg",
  },
  {
    label: "Generative Fill",
    route: "/transforms/add/fill",
    icon: "/assets/icons/stars.svg",
  },
  {
    label: "Object Remove",
    route: "/transforms/add/remove",
    icon: "/assets/icons/scan.svg",
  },
  {
    label: "Object Recolor",
    route: "/transforms/add/recolor",
    icon: "/assets/icons/filter.svg",
  },
  {
    label: "Background Remove",
    route: "/transforms/add/removeBackground",
    icon: "/assets/icons/camera.svg",
  },
  {
    label: "Profile",
    route: "/profile",
    icon: "/assets/icons/profile.svg",
  },
];

export const transformationTypes = {
  restore: {
    type: "restore",
    title: "Restore Image",
    subTitle: "Refine images by removing noise and imperfections",
    config: { restore: true },
    icon: "image.svg",
  },
  removeBackground: {
    type: "removeBackground",
    title: "Background Remove",
    subTitle: "Removes the background of the image using AI",
    config: { removeBackground: true },
    icon: "camera.svg",
  },
  fill: {
    type: "fill",
    title: "Generative Fill",
    subTitle: "Enhance an image's dimensions using AI outpainting",
    config: { fillBackground: true },
    icon: "stars.svg",
  },
  remove: {
    type: "remove",
    title: "Object Remove",
    subTitle: "Identify and eliminate objects from images",
    config: {
      remove: { prompt: "", removeShadow: true, multiple: true },
    },
    icon: "scan.svg",
  },
  recolor: {
    type: "recolor",
    title: "Object Recolor",
    subTitle: "Identify and recolor objects from the image",
    config: {
      recolor: { prompt: "", to: "", multiple: true },
    },
    icon: "filter.svg",
  },
};

export const aspectRatioOptions = {
  "1:1": {
    aspectRatio: "1:1",
    label: "Instagram Square (1:1)",
    width: 1080,
    height: 1080,
  },
  "3:4": {
    aspectRatio: "4:5",
    label: "Instagram Portrait (4:5)",
    width: 1080,
    height: 1350,
  },
  "16:9": {
    aspectRatio: "16:9",
    label: "Twitter Post (16:9)",
    width: 1200,
    height: 675,
  },
  "3:1": {
    aspectRatio: "3:1",
    label: "Twitter Header (3:1)",
    width: 1500,
    height: 500,
  },
  "205:78": {
    aspectRatio: "205:78",
    label: "Facebook Cover (205:78)",
    width: 820,
    height: 312,
  },
};
export const defaultValues = {
  title: "",
  aspectRatio: "",
  color: "",
  prompt: "",
  publicId: "",
};

export const creditFee = -1;
