const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

function normalizeMemoDate(memoDate) {
  if (typeof memoDate !== "string" || memoDate.length === 0) {
    return memoDate;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(memoDate)) {
    return memoDate;
  }

  const parsedDate = new Date(memoDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return memoDate;
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeMemo(item) {
  if (!item || typeof item !== "object") {
    return item;
  }

  return {
    ...item,
    memoDate: normalizeMemoDate(item.memoDate),
  };
}

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
  return request("/memos").then((payload) => ({
    ...payload,
    items: Array.isArray(payload.items) ? payload.items.map(normalizeMemo) : [],
  }));
}

export function getMemoByDate(date) {
  return request(`/memos/${date}`).then((payload) => ({
    ...payload,
    item: payload.item ? normalizeMemo(payload.item) : null,
  }));
}

export function getCatchallMemo() {
  return request("/catchall-memo");
}

export function saveMemo({ memoDate, content }) {
  return request("/memos", {
    method: "POST",
    body: JSON.stringify({ memoDate, content }),
  });
}

export function saveCatchallMemo({ content }) {
  return request("/catchall-memo", {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function deleteMemo(date) {
  return request(`/memos/${date}`, {
    method: "DELETE",
  });
}

export function deleteCatchallMemo() {
  return request("/catchall-memo", {
    method: "DELETE",
  });
}

export function getHealth() {
  return request("/health");
}
