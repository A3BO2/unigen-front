// 시간 차이를 계산하는 헬퍼 함수
export const getTimeAgo = (createdAt) => {
  if (!createdAt) return "방금 전";
  
  const now = new Date(); // 현재 시간 (로컬 시간대, KST)
  
  // DB에서 가져온 시간이 UTC 문자열 형식인 경우
  // 예: "2024-01-01T12:00:00.000Z" 또는 "2024-01-01 12:00:00"
  let postDate;
  if (createdAt instanceof Date) {
    postDate = createdAt;
  } else if (typeof createdAt === 'string') {
    // UTC 시간으로 파싱 (Z가 있으면 UTC, 없으면 UTC로 가정)
    if (createdAt.includes('Z') || createdAt.includes('+') || createdAt.includes('-', 10)) {
      postDate = new Date(createdAt);
    } else {
      // "YYYY-MM-DD HH:mm:ss" 형식인 경우 UTC로 파싱
      postDate = new Date(createdAt + 'Z');
    }
  } else {
    postDate = new Date(createdAt);
  }
  
  // 유효하지 않은 날짜면 "방금 전" 반환
  if (isNaN(postDate.getTime())) {
    console.warn("Invalid date:", createdAt);
    return "방금 전";
  }
  
  // UTC 시간을 한국 시간(KST, UTC+9)으로 변환
  // postDate는 UTC이므로 9시간을 더해 KST로 변환
  const kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로 변환
  const postDateKST = new Date(postDate.getTime() + kstOffset);
  
  // 현재 시간과 비교 (now는 이미 로컬 시간대이므로 그대로 사용)
  const diffMs = now.getTime() - postDateKST.getTime();
  
  // 음수면 미래 시간이므로 "방금 전"
  if (diffMs < 0) return "방금 전";
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // 1분 미만: 초 단위
  if (diffSecs < 60) return `${diffSecs}초 전`;
  // 1시간 미만: 분 단위
  if (diffMins < 60) return `${diffMins}분 전`;
  // 24시간 미만: 시간 단위
  if (diffHours < 24) return `${diffHours}시간 전`;
  // 24시간 이상: 일 단위
  return `${diffDays}일 전`;
};
