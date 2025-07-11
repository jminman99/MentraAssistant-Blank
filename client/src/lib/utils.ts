import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ApiResponse, DevServerError } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse API response text, handling both JSON and HTML responses
 * Throws DevServerError for development server HTML responses
 */
export function parseApiJson<T = any>(text: string): ApiResponse<T> {
  if (text.includes('<!DOCTYPE html>')) {
    throw new DevServerError("Development server returned HTML instead of JSON");
  }
  
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON response: ${text.slice(0, 100)}...`);
  }
}
