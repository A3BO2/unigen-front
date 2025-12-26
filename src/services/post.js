import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL; // http://localhost:3000/api/v1

export async function apifetch(url, options) {
  const res = await fetch(`${baseURL}${url}`, {
    ...options,
    headers: {
      "content-Type": "application/json",
      ...options.headers,
    },
  });
  let data;
  try {
    data = await res.json();
  } catch (error) {
    console.error(error);
  }
  if (res.status > 299 || res.status < 200) {
    const message =
      data && data.message ? data.message : "API 요청 중 에러가 발생했습니다.";
    throw new Error(message);
  }
  return data;
}

export function getHeaders() {
  const token = sessionStorage.getItem("token"); // 로컬 스토리지에서 토큰을 가져옴
  console.log("Authorization Token:", token);
  return {
    Authorization: token ? `Bearer ${token}` : "",
  };
}

// 피드 수정
export async function updatePost(postId, content) {
  return await apifetch(`/posts/${postId}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ content }),
  });
}

// 피드 삭제
export async function deletePost(postId) {
  return await apifetch(`/posts/${postId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
}

// api 예시 https://api.seniorsns.com/api/v1/posts/feed?mode=senior&page=1&size=10
export async function getPosts(mode, page = 1, size = 10, all) {
  const params = new URLSearchParams();
  if (mode) params.append("mode", mode);
  params.append("page", page);
  params.append("size", size);
  if (all) params.append("all", all);

  const query = params.toString() ? `?${params.toString()}` : "";
  console.log(query);
  return await apifetch(`/posts/feed${query}`, {
    method: "GET",
    headers: getHeaders(),
  });
}

export async function getReel(lastId) {
  const params = new URLSearchParams();
  if (lastId) params.append("lastId", lastId);

  const query = params.toString() ? `?${params.toString()}` : "";

  return await apifetch(`/posts/reels${query}`, {
    method: "GET",
    headers: getHeaders(),
  });
}

export async function getStories() {
  return await apifetch(`/stories`, {
    method: "GET",
    headers: getHeaders(),
  });
}

export async function getSeniorPosts(mode, page = 1, size = 5, all) {
  const params = new URLSearchParams();
  if (mode) params.append("mode", mode);
  if (page) params.append("page", page);
  if (size) params.append("size", size);
  if (all) params.append("all", all);

  const query = params.toString() ? `?${params.toString()}` : "";

  return await apifetch(`/posts/seniorFeed${query}`, {
    method: "GET",
    headers: getHeaders(),
  });
}

export async function getPostById(postId) {
  return await apifetch(`/posts/${postId}`, {
    method: "GET",
    headers: getHeaders(),
  });
}

export async function createPost(formData) {
  const token = sessionStorage.getItem("token");

  // apifetch 대신 fetch를 직접 사용해서 Content-Type 문제를 회피
  const res = await fetch(`${baseURL}/posts`, {
    method: "POST",
    headers: {
      // Content-Type을 적지 않아야 브라우저가 알아서 'multipart/form-data'로 설정해줌
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
    throw new Error(data?.message || "업로드 실패");
  }
  return data;
}

// =========================
// 좋아요 (피드/릴스 공용)
// =========================

// 좋아요 추가
export async function likePost(postId) {
  return await apifetch(`/posts/${postId}/like`, {
    method: "POST",
    headers: getHeaders(),
  });
}

// 좋아요 취소
export async function unlikePost(postId) {
  return await apifetch(`/posts/${postId}/like`, {
    method: "DELETE",
    headers: getHeaders(),
  });
}

// 좋아요 여부 확인
export async function isPostLike(postId) {
  return await apifetch(`/posts/${postId}/is-liked`, {
    method: "GET",
    headers: getHeaders(),
  });
}

// 댓글 생성
export async function createComment(postId, content) {
  return await apifetch(`/comments`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ postId, content }),
  });
}
