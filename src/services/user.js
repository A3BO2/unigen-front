const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

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
    const message = data?.message || "프로필 수정에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

export async function getFollowers() {
  const response = await fetch(`${baseURL}/users/me/followers`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse /users/me/followers response", error);
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
    const message = data?.message || "팔로워 목록 조회에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

export async function getFollowing() {
  const response = await fetch(`${baseURL}/users/me/following`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse /users/me/following response", error);
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
    const message = data?.message || "팔로우 목록 조회에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

export async function followUser(followeeId) {
  const response = await fetch(`${baseURL}/users/follow`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ followeeId }),
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse followUser response", error);
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
    const message = data?.message || "팔로우에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

export async function removeFollower(followerId) {
  const response = await fetch(`${baseURL}/users/me/followers/${followerId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse removeFollower response", error);
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
    const message = data?.message || "팔로워 삭제에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

// 프로필 이미지 업로드
export async function uploadProfileImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const token = sessionStorage.getItem("token");
  
  const response = await fetch(`${baseURL}/users/me/profile-image`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      // Content-Type을 설정하지 않아야 브라우저가 multipart/form-data로 자동 설정
    },
    body: formData,
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse uploadProfileImage response", error);
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
    const message = data?.message || "프로필 이미지 업로드에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

// 팔로우 여부 확인
export async function isFollowing(followeeId) {
  const params = new URLSearchParams();
  if (followeeId) params.append("followeeId", String(followeeId));
  const query = params.toString() ? `?${params.toString()}` : "";

  const response = await fetch(`${baseURL}/users/isfollowing${query}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse isFollowing response", error);
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
    const message = data?.message || "팔로우 여부 확인에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

// 사용자 검색
export async function searchUsers(query) {
  const params = new URLSearchParams();
  if (query) params.append("q", String(query));
  const searchQuery = params.toString() ? `?${params.toString()}` : "";

  const response = await fetch(`${baseURL}/users/search${searchQuery}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse searchUsers response", error);
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
    const message = data?.message || "사용자 검색에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

// 언팔로우 요청
export async function unfollowUser(followeeId) {
  const response = await fetch(`${baseURL}/users/me/following/${followeeId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse unfollowUser response", error);
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
    const message = data?.message || "팔로우 취소에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}
