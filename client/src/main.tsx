import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";
import { Toaster } from "./components/ui/toaster";
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

if (!PUBLISHABLE_KEY) {
  throw new Error("Clerk publishable key is missing.");
}

const ClerkAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ClerkProvider
    publishableKey={PUBLISHABLE_KEY}
    signInUrl="/sign-in"
    signUpUrl="/sign-up"
    afterSignInUrl="/"
    afterSignUpUrl="/"
  >
    {children}
  </ClerkProvider>
);

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ClerkAppProvider>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <App />
        </Suspense>
        <Toaster />
      </QueryClientProvider>
    </ClerkAppProvider>
  </React.StrictMode>
);