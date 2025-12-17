// 시간 차이를 계산하는 헬퍼 함수
export const getTimeAgo = (createdAt) => {
  const now = new Date();
  const postDate = new Date(createdAt);
  const diffMs = now - postDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${diffDays}일 전`;
};
