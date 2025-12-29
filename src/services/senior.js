const baseURL = import.meta.env.VITE_API_BASE_URL;
if (!baseURL) {
  throw new Error("VITE_API_BASE_URL 환경변수가 설정되지 않았습니다.");
}

function getAuthHeaders() {
  const token = sessionStorage.getItem("token");
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
}

export const getCommentsByPostId = async (postId) => {
  const response = await fetch(`${baseURL}/senior/comment/${postId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  let data;
  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse response", error);
  }

  if (!response.ok) {
    const message = data?.message || "댓글 조회에 실패했습니다.";
    throw new Error(message);
  }

  return data;
};

export const addCommentToPost = async (postId, content) => {
  const response = await fetch(`${baseURL}/senior/comment/${postId}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ content }),
  });

  let data;
  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse response", error);
  }

  if (!response.ok) {
    const message = data?.message || "댓글 추가에 실패했습니다.";
    throw new Error(message);
  }

  return data;
};

export const likePost = async (postId) => {
  const response = await fetch(`${baseURL}/senior/postlike/${postId}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  let data;
  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse response", error);
  }

  if (!response.ok) {
    const message = data?.message || "게시물 좋아요에 실패했습니다.";
    throw new Error(message);
  }

  return data;
};

export const unlikePost = async (postId) => {
  const response = await fetch(`${baseURL}/senior/postlike/${postId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  let data;
  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse response", error);
  }

  if (!response.ok) {
    const message = data?.message || "게시물 좋아요 취소에 실패했습니다.";
    throw new Error(message);
  }

  return data;
};

export const isLikePost = async (postId) => {
  const response = await fetch(`${baseURL}/senior/postlike/${postId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  let data;
  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse response", error);
  }

  if (!response.ok) {
    const message = data?.message || "게시물 좋아요 상태 확인에 실패했습니다.";
    throw new Error(message);
  }

  return data;
};

// AI 글 다듬기 요청
export const refineContent = async (text, theme, imageBase64) => {
  try {
    const response = await fetch(`${baseURL}/ai/refine`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        text,
        theme,
        image: imageBase64,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || "AI 변환 실패");
    }

    const data = await response.json();

    return data.result;
  } catch (error) {
    console.error("❌ [Front-Error] API 호출 중 에러:", error);
    throw error;
  }
};
