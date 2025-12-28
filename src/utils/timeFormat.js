/**
 * Instagram 스타일의 상대 시간 포맷팅 함수
 * @param {string|Date} date - ISO 문자열 또는 Date 객체
 * @returns {string} - "방금 전", "5분 전", "2시간 전", "3일 전", "2024년 1월 15일" 등
 */
export const formatRelativeTime = (date) => {
  if (!date) return "";

  const now = new Date();
  const targetDate = typeof date === "string" ? new Date(date) : date;

  // 유효하지 않은 날짜인 경우
  if (isNaN(targetDate.getTime())) {
    return "";
  }

  const diffInSeconds = Math.floor((now - targetDate) / 1000);

  // 1분 미만 (60초 미만)
  if (diffInSeconds < 60) {
    return "방금 전";
  }

  // 1시간 미만 (60분 미만)
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`;
  }

  // 24시간 미만
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}시간 전`;
  }

  // 7일 미만
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}일 전`;
  }

  // 1년 미만 - 월과 일만 표시 (예: "1월 15일")
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 52) {
    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();
    return `${month}월 ${day}일`;
  }

  // 1년 이상 - 연도 포함 (예: "2023년 1월 15일")
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  return `${year}년 ${month}월 ${day}일`;
};
