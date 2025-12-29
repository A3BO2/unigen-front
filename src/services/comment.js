import { apifetch, getHeaders } from "./post";

/* =========================
 * 게시글별 댓글 조회
 * GET /comments/post/:postId
 * (인증 불필요)
 ========================= */
export async function fetchComments(postId) {
  return await apifetch(`/comments/post/${postId}`, {
    method: "GET",
  });
}

/* =========================
 * 댓글 생성
 * POST /comments
 * (인증 필요)
 ========================= */
export async function createComment(postId, content) {
  return await apifetch(`/comments`, {
    method: "POST",
    headers: getHeaders(), // 🔥 핵심
    body: JSON.stringify({
      postId,
      content,
    }),
  });
}

/* =========================
 * 댓글 삭제
 * DELETE /comments/:commentId
 * (인증 필요)
 ========================= */
export async function deleteComment(commentId) {
  return await apifetch(`/comments/${commentId}`, {
    method: "DELETE",
    headers: getHeaders(), // 🔥 핵심
  });
}
