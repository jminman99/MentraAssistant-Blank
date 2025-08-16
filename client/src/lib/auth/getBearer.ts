
export async function getBearer(getToken: (() => Promise<string>) | any) {
  if (!getToken) return null;
  try { return await getToken({ template: "mentra-api" }); } catch {}
  try { return await getToken({ template: "default" }); } catch {}
  try { return await getToken(); } catch {}
  return null;
}
