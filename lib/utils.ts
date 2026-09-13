import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format counts with Western Arabic digits (0–9), never Roman or locale-native digits. */
export function formatCount(value: number): string {
  return value.toLocaleString("en-US", { numberingSystem: "latn" });
}
