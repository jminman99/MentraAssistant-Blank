// src/lib/sessionApi.ts

export async function cancelSession(
  sessionType: "individual" | "council",
  id: number
) {
  // Check if we're in development mode
  if (import.meta.env.DEV) {
    return {
      success: true,
      message: `Development mode: Would cancel ${sessionType} session ${id}`,
      data: { id, sessionType, cancelled: true }
    };
  }

  if (!id || id <= 0) {
    throw new Error("Invalid session ID");
  }

  // Simple POST endpoints that work reliably
  const url = sessionType === "individual"
    ? `/api/cancel-individual-session`
    : `/api/cancel-council-session`;

  const body = sessionType === "individual"
    ? { sessionId: id }
    : { participantId: id };

  console.log(`[CANCEL] Calling ${url} with:`, body);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${await window.Clerk?.session?.getToken()}`,
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  console.log(`[CANCEL] Response status: ${response.status}`);

  let result;

  try {
    result = await response.json();
    console.log(`[CANCEL] Response data:`, result);
  } catch (e) {
    throw new Error("Server returned invalid JSON");
  }

  if (!response.ok) {
    throw new Error(result?.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return result;
}