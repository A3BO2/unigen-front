const baseURL = import.meta.env.VITE_API_BASE_URL; // http://localhost:3000/api/v1

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
}

export async function getCurrentUser(page = 1, limit = 9) {
  const params = new URLSearchParams();
  if (page) params.append("page", String(page));
  if (limit) params.append("limit", String(limit));
  const query = params.toString() ? `?${params.toString()}` : "";

  const response = await fetch(`${baseURL}/users/me${query}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse /users/me response", error);
  }

  if (!response.ok) {
    const message = data?.message || "내 정보 조회에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}
