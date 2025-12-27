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

  // 401 에러 (인증 실패) 처리
  if (response.status === 401) {
    // 토큰 제거
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("appMode");
    
    // 로그인 페이지로 리다이렉트
    const currentPath = window.location.pathname;
    if (currentPath.includes("/senior")) {
      window.location.href = "/senior/login";
    } else {
      window.location.href = "/normal/login";
    }
    
    const message = data?.message || "유효하지 않거나 만료된 토큰입니다.";
    throw new Error(message);
  }

  if (!response.ok) {
    const message = data?.message || "내 정보 조회에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

export async function getUserSettings() {
  const response = await fetch(`${baseURL}/users/me/settings`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse /users/me/settings response", error);
  }

  // 401 에러 (인증 실패) 처리
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("appMode");
    
    const currentPath = window.location.pathname;
    if (currentPath.includes("/senior")) {
      window.location.href = "/senior/login";
    } else {
      window.location.href = "/normal/login";
    }
    
    const message = data?.message || "유효하지 않거나 만료된 토큰입니다.";
    throw new Error(message);
  }

  if (!response.ok) {
    const message = data?.message || "설정 조회에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

export async function updateUserSettings(settings) {
  const response = await fetch(`${baseURL}/users/me/settings`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(settings),
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse /users/me/settings response", error);
  }

  // 401 에러 (인증 실패) 처리
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("appMode");
    
    const currentPath = window.location.pathname;
    if (currentPath.includes("/senior")) {
      window.location.href = "/senior/login";
    } else {
      window.location.href = "/normal/login";
    }
    
    const message = data?.message || "유효하지 않거나 만료된 토큰입니다.";
    throw new Error(message);
  }

  if (!response.ok) {
    const message = data?.message || "설정 업데이트에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}