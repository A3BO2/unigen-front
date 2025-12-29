import { apifetch, getHeaders } from "./post";

const baseURL = import.meta.env.VITE_API_BASE_URL;
if (!baseURL) {
  throw new Error("VITE_API_BASE_URL 환경변수가 설정되지 않았습니다.");
}

export async function createStory(formData) {
  const token = sessionStorage.getItem("token");

  const res = await fetch(`${baseURL}/stories`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: formData,
  });

  // 응답 처리
  let data;
  try {
    data = await res.json();
  } catch {
    // JSON 파싱 실패 (정상 처리)
  }

  // 401 에러 (인증 실패) 처리
  if (res.status === 401) {
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

  if (!res.ok) {
    throw new Error(data?.message || "스토리 업로드 실패");
  }
  return data;
}

export async function getStoryViewers(storyId) {
  return await apifetch(`/stories/viewers/${storyId}`, {
    method: "GET",
    headers: getHeaders(),
  });
}

export async function isMyStory(storyId) {
  return await apifetch(`/stories/ismine/${storyId}`, {
    method: "GET",
    headers: getHeaders(),
  });
}

export async function watchStory(storyId) {
  return await apifetch(`/stories/watch/${storyId}`, {
    method: "POST",
    headers: getHeaders(),
  });
}
