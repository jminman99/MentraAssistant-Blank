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



// Booking utility functions
export const DEFAULT_MENTOR_IMAGE = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64';

export const durationOptions = [
  { label: "30 minutes", value: 30 },
  { label: "60 minutes", value: 60 },
  { label: "90 minutes", value: 90 },
];

export function formatDateTimeForInput(date: Date, time: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T${time}`;
}

export async function fetchWithClerkToken(
  getToken: () => Promise<string>, 
  url: string, 
  options: RequestInit = {}
) {
  const token = await getClerkToken(getToken);
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
}
