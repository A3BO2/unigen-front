// 카카오 인증 유틸리티

/**
 * 카카오 SDK 초기화
 * @param {string} appKey - 카카오 앱 키 (환경변수에서 가져옴)
 */
export const initKakaoSDK = (appKey) => {
  if (window.Kakao) {
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(appKey);
    }
    return true;
  }
  return false;
};

/**
 * 카카오 로그인 실행
 * @returns {Promise<string>} 카카오 액세스 토큰
 */
export const loginWithKakao = () => {
  return new Promise((resolve, reject) => {
    if (!window.Kakao) {
      reject(new Error("카카오 SDK가 로드되지 않았습니다."));
      return;
    }

    if (!window.Kakao.isInitialized()) {
      reject(new Error("카카오 SDK가 초기화되지 않았습니다."));
      return;
    }

    // 리다이렉트 방식으로 로그인
    // redirectUri는 카카오 개발자 콘솔에 등록된 Redirect URI와 정확히 일치해야 함
    // 쿼리스트링과 해시를 제외한 현재 경로만 사용
    const currentPath = window.location.pathname;
    const redirectUri = window.location.origin + currentPath;
    
    window.Kakao.Auth.authorize({
      redirectUri: redirectUri,
    });
    
    // 리다이렉트 방식이므로 여기서는 Promise를 resolve하지 않음
    // 콜백은 페이지 로드 시 URL의 code 파라미터로 처리됨
  });
};

/**
 * 카카오 로그아웃
 */
export const logoutWithKakao = () => {
  if (window.Kakao && window.Kakao.isInitialized()) {
    window.Kakao.Auth.logout();
  }
};

