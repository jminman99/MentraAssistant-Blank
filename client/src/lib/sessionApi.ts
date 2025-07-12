// src/lib/sessionApi.ts

export async function cancelSession(
  sessionType: "individual" | "council",
  id: number
) {
  if (!id || id <= 0) {
    throw new Error("Invalid session ID");
  }

  const url = sessionType === "individual"
    ? `/api/session-bookings/${id}/cancel`
    : `/api/council-sessions/${id}/cancel`;

  const method = "POST"; // Both endpoints now use POST

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${await window.Clerk?.session?.getToken()}`,
    },
    credentials: "include",
  });

  let result;

  try {
    result = await response.json();
  } catch (e) {
    throw new Error("Server returned invalid JSON");
  }

  if (!response.ok) {
    throw new Error(result?.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return result;
}