const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://qdxtmdyagsxtvtjaxqou.supabase.co";
const SA_TOKEN_KEY = "roomly_superadmin_token";

export function getSuperadminToken(): string | null {
  return sessionStorage.getItem(SA_TOKEN_KEY);
}

export function setSuperadminToken(token: string) {
  sessionStorage.setItem(SA_TOKEN_KEY, token);
}

export function clearSuperadminToken() {
  sessionStorage.removeItem(SA_TOKEN_KEY);
}

export async function superadminLogin(email: string, password: string): Promise<{ token?: string; error?: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/superadmin-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || "Login failed" };
  setSuperadminToken(data.token);
  return { token: data.token };
}

export async function verifySuperadminSession(): Promise<boolean> {
  const token = getSuperadminToken();
  if (!token) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/superadmin-auth?action=verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.valid === true;
  } catch {
    return false;
  }
}

export async function superadminFetch(functionName: string, body: Record<string, unknown>) {
  const token = getSuperadminToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
