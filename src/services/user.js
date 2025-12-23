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

  if (!response.ok) {
    const message = data?.message || "설정 업데이트에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

// 팔로우 상태 확인
export async function isFollowing(followeeId) {
  const response = await fetch(
    `${baseURL}/users/isfollowing?followeeId=${followeeId}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse is-following response", error);
  }

  if (!response.ok) {
    const message = data?.message || "팔로우 상태 확인에 실패했습니다.";
    throw new Error(message);
  }

  return data; // { isFollowing, isMine } 전체 반환
}

// 팔로우 요청
export async function followUser(followeeId) {
  const response = await fetch(
    `${baseURL}/users/follow?followeeId=${followeeId}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse follow response", error);
  }

  if (!response.ok) {
    const message = data?.message || "팔로우 요청에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

// 언팔로우 요청
export async function unfollowUser(followeeId) {
  const response = await fetch(
    `${baseURL}/users/unfollow?followeeId=${followeeId}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse unfollow response", error);
  }

  if (!response.ok) {
    const message = data?.message || "언팔로우 요청에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}
