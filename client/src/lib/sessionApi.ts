// src/lib/sessionApi.ts

export async function cancelSession(
  sessionType: "individual" | "council",
  id: number
) {
  if (!id || id <= 0) {
    throw new Error("Invalid session ID");
  }

  // Use the simple POST endpoints that exist in the codebase
  const url = sessionType === "individual"
    ? `/api/cancel-individual-session`
    : `/api/cancel-council-session`;

  const body = sessionType === "individual"
    ? { sessionId: id }
    : { participantId: id };

  console.log(`[CANCEL] Calling ${url} with:`, body);

  // Get Clerk token safely
  let token = null;
  try {
    if (window.Clerk?.session) {
      token = await window.Clerk.session.getToken();
    }
  } catch (e) {
    console.warn("Failed to get Clerk token:", e);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });

  console.log(`[CANCEL] Response status: ${response.status}`);

  if (!response.ok) {
    // Handle 405 Method Not Allowed from dev server
    if (response.status === 405) {
      throw new Error("API endpoint not available in development mode. Please test in production deployment.");
    }
    
    let errorText = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorResult = await response.json();
      if (errorResult?.error) {
        errorText = errorResult.error;
      }
    } catch (e) {
      // Keep original error message if JSON parsing fails
    }
    throw new Error(errorText);
  }

  let result;
  try {
    result = await response.json();
    console.log(`[CANCEL] Response data:`, result);
  } catch (e) {
    throw new Error("Server returned invalid response");
  }

  return result;
}