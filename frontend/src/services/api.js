const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Une erreur est survenue.");
  }

  return payload;
}

export function getMemos() {
  return request("/memos");
}

export function getMemoByDate(date) {
  return request(`/memos/${date}`);
}

export function saveMemo({ memoDate, content }) {
  return request("/memos", {
    method: "POST",
    body: JSON.stringify({ memoDate, content }),
  });
}

export function deleteMemo(date) {
  return request(`/memos/${date}`, {
    method: "DELETE",
  });
}

export function getHealth() {
  return request("/health");
}
