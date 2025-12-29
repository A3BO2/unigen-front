const baseURL = import.meta.env.VITE_API_BASE_URL;
if (!baseURL) {
  throw new Error("VITE_API_BASE_URL 환경변수가 설정되지 않았습니다.");
}

export async function apifetch(url, options) {
  try {
    const fullUrl = `${baseURL}${url}`;

    const res = await fetch(fullUrl, {
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
      console.error("JSON 파싱 에러:", error);
      data = null;
    }

    // 401 에러 (인증 실패) 처리
    if (res.status === 401) {
      // 토큰 제거
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("appMode");

      // 로그인 페이지로 리다이렉트 (현재 경로에 따라)
      const currentPath = window.location.pathname;
      if (currentPath.includes("/senior")) {
        window.location.href = "/senior/login";
      } else {
        window.location.href = "/normal/login";
      }

      const message = data?.message || "유효하지 않거나 만료된 토큰입니다.";
      throw new Error(message);
    }

    if (res.status > 299 || res.status < 200) {
      const message =
        data && data.message
          ? data.message
          : "API 요청 중 에러가 발생했습니다.";
      throw new Error(message);
    }
    return data;
  } catch (error) {
    // 네트워크 에러 처리
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      console.error("네트워크 에러:", error);
      throw new Error(
        "서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요."
      );
    }
    throw error;
  }
}

export function getHeaders() {
  const token = sessionStorage.getItem("token"); // 로컬 스토리지에서 토큰을 가져옴
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
