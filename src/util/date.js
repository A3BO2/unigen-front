export const getTimeAgo = (dateString) => {
  if (!dateString) return "";

  try {
    // 1. 날짜 데이터 전처리 (아까와 동일한 안전장치)
    let str = String(dateString);
    if (str.includes(" ") && !str.includes("T")) str = str.replace(" ", "T");

    // [중요] Z가 없으면 UTC로 간주해서 Z를 붙여줌 (9시간 시차 해결 핵심)
    if (!str.includes("Z") && !str.includes("+")) str += "Z";

    const postDate = new Date(str);
    const now = new Date();

    // 2. 현재 시간과의 차이 계산 (밀리초 단위)
    const diff = now - postDate;

    // 계산된 시간 차이를 초, 분, 시간, 일 단위로 변환
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    // [예외 처리] 미래의 시간이면(오차 범위) '방금 전'으로 처리
    if (diff < 0) return "방금 전";

    // 3. 조건에 따라 글자 반환
    if (seconds < 60) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;

    // 4. 7일이 넘으면 그냥 날짜로 보여줌 (너무 오래된 건 '100일 전'보다 날짜가 나음)
    return `${postDate.getFullYear()}년 ${
      postDate.getMonth() + 1
    }월 ${postDate.getDate()}일`;
  } catch (error) {
    // 에러나면 그냥 원본 보여줌
    return String(dateString);
  }
};
