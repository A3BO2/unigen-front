const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

function getAuthHeaders() {
  const token = sessionStorage.getItem("token");
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

  let response;
  try {
    response = await fetch(`${baseURL}/users/me${query}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
  } catch (error) {
    console.error("Network error:", error);
    throw new Error("서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.");
  }

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse /users/me response", error);
    throw new Error("서버 응답을 처리할 수 없습니다.");
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

// 내 프로필 수정 (이름, 사용자 이름, 프로필 이미지 등)
export async function updateUserProfile(profile) {
  const response = await fetch(`${baseURL}/users/me`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(profile),
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse /users/me update response", error);
  }

  if (!response.ok) {
    const message = data?.message || "프로필 수정에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

// 팔로우 상태 확인
export async function isFollowing(followeeId) {
  const response = await fetch(
    `${baseURL}/users/isfollowing?followee_id=${followeeId}`,
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

  return data; // { isFollowing } 반환
}

// 팔로우 요청
export async function followUser(followeeId) {
  const response = await fetch(`${baseURL}/users/follow`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ followee_id: followeeId }),
  });

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
  const response = await fetch(`${baseURL}/users/unfollow`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ followee_id: followeeId }),
  });

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

// 프로필 이미지 업로드
export async function uploadProfileImage(file) {
  const token = sessionStorage.getItem("token");
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${baseURL}/users/me/profile-image`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: formData,
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse profile image upload response", error);
  }

  if (!response.ok) {
    const message = data?.message || "프로필 이미지 업로드에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}
