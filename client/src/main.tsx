
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App-simple";
import "./index.css";
import { ClerkTokenProvider } from "./components/ClerkTokenProvider";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Persist a single QueryClient across Vite HMR in development.
const existingQC = (globalThis as any).__queryClient;
const queryClient =
  existingQC ||
  new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false },
    },
  });
(globalThis as any).__queryClient = queryClient;

const env = (import.meta as any).env ?? {};
const PUBLISHABLE_KEY: string | undefined = env.VITE_CLERK_PUBLISHABLE_KEY;
const IS_DEV = !!env.DEV;

if (!PUBLISHABLE_KEY && !IS_DEV) {
  throw new Error("Clerk publishable key is missing in production.");
}
if (!PUBLISHABLE_KEY && IS_DEV) {
  console.warn("⚠️ Clerk publishable key is missing. Running app without authentication.");
}

// Wrap with Clerk only when configured; otherwise pass children through.
const MaybeClerkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  PUBLISHABLE_KEY ? (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      {children}
    </ClerkProvider>
  ) : (
    <>{children}</>
  );

// Use a typed alias so TS is happy when swapping between a component and Fragment.
const MaybeClerkTokenProvider: React.ComponentType<{ children: React.ReactNode }> =
  PUBLISHABLE_KEY ? ClerkTokenProvider : React.Fragment;

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

ReactDOM.createRoot(rootEl).render(
  // Note: React.StrictMode double-mounts effects in development. Remove temporarily if it interferes with debugging.
  <React.StrictMode>
    <MaybeClerkProvider>
      <QueryClientProvider client={queryClient}>
        <MaybeClerkTokenProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <App />
          </Suspense>
          <Toaster />
        </MaybeClerkTokenProvider>
      </QueryClientProvider>
    </MaybeClerkProvider>
  </React.StrictMode>
);
