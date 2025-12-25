const baseURL = import.meta.env.VITE_API_BASE_URL;

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
