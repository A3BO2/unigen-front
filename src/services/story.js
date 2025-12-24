import { apifetch, getHeaders } from "./post";

const baseURL = import.meta.env.VITE_API_BASE_URL;

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
  } catch (error) {
    console.log(error);
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
