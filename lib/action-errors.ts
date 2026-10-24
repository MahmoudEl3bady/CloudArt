import type { ActionError } from "@/types";

export const errorLabels: Record<ActionError, string> = {
  UNAUTHENTICATED: "Please sign in and try again",
  INVALID_INPUT: "Some fields are invalid",
  NOT_FOUND: "That image no longer exists",
  RATE_LIMITED: "Too many requests, please slow down",
  SERVER_ERROR: "Something went wrong, please try again",
};
