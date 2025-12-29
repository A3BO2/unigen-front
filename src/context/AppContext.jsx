import { createContext, useContext, useState, useEffect } from "react";

const AppContext = createContext();

// 안전한 sessionStorage 접근 함수
const safeSessionStorage = {
  getItem: (key) => {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.warn("sessionStorage access denied:", error);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.warn("sessionStorage write denied:", error);
    }
  },
  removeItem: (key) => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn("sessionStorage remove denied:", error);
    }
  },
};

export const AppProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    // 세션 스토리지에서 모드 불러오기
    return safeSessionStorage.getItem("appMode") || null;
  });

  const [user, setUser] = useState(() => {
    // 세션 스토리지에서 유저 정보 불러오기
    const savedUser = safeSessionStorage.getItem("user");
    try {
      const parsedUser = savedUser ? JSON.parse(savedUser) : null;
      // signup_mode가 없으면 null로 설정 (나중에 백엔드에서 가져옴)
      return parsedUser;
    } catch {
      return null;
    }
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    // 세션 스토리지에서 다크모드 상태 불러오기
    const savedDarkMode = safeSessionStorage.getItem("isDarkMode");
    return savedDarkMode === "true" ? true : false;
  });

  const [fontScale, setFontScale] = useState(() => {
    // 세션 스토리지에서 폰트 크기 불러오기
    return safeSessionStorage.getItem("fontScale") || "large";
  });

  useEffect(() => {
    if (mode) {
      safeSessionStorage.setItem("appMode", mode);
    }
  }, [mode]);

  useEffect(() => {
    if (user) {
      // user 객체를 저장할 때 signup_mode가 포함되도록 보장
      safeSessionStorage.setItem("user", JSON.stringify(user));
    } else {
      safeSessionStorage.removeItem("user");
    }
  }, [user]);

  // user가 있지만 signup_mode가 없으면 백엔드에서 가져오기
  useEffect(() => {
    const fetchUserSignupMode = async () => {
      // user가 없거나 이미 signup_mode가 있으면 스킵
      if (!user || user.signup_mode) {
        return;
      }

      const token = safeSessionStorage.getItem("token");
      if (!token || typeof token !== "string" || token.trim() === "") {
        return;
      }

      try {
        const baseURL = import.meta.env.VITE_API_BASE_URL;
        if (!baseURL) {
          throw new Error("VITE_API_BASE_URL 환경변수가 설정되지 않았습니다.");
        }
        const response = await fetch(`${baseURL}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.user && data.data.user.signup_mode) {
            // signup_mode만 업데이트
            setUser({ ...user, signup_mode: data.data.user.signup_mode });
          }
        }
      } catch (error) {
        console.error("signup_mode 가져오기 실패:", error);
      }
    };

    fetchUserSignupMode();
  }, [user]);

  useEffect(() => {
    safeSessionStorage.setItem("isDarkMode", isDarkMode.toString());
  }, [isDarkMode]);

  useEffect(() => {
    if (fontScale) {
      safeSessionStorage.setItem("fontScale", fontScale);
      // CSS 변수로 폰트 크기 설정
      const root = document.documentElement;
      const scaleMap = {
        small: 0.85,
        medium: 1,
        large: 1.25,
      };
      root.style.setProperty("--font-scale", scaleMap[fontScale] || 1);
    }
    // CSS 변수로 폰트 크기 설정 (fontScale이 변경될 때마다)
    const root = document.documentElement;
    const scaleMap = {
      small: 0.85,
      medium: 1,
      large: 1.25,
    };
    root.style.setProperty("--font-scale", scaleMap[fontScale] || 1);
  }, [fontScale]);

  // 토큰 기반 자동 로그인 (앱 시작 시)
  useEffect(() => {
    const checkAuth = async () => {
      const token = safeSessionStorage.getItem("token");

      // 토큰이 없거나 유효하지 않으면 (null, undefined, 빈 문자열, 공백만 있는 경우) 조기 반환
      if (!token || typeof token !== "string" || token.trim() === "") {
        return;
      }

      // user가 이미 있고 signup_mode도 있으면 백엔드 호출 생략
      const currentUser = user;
      if (currentUser && currentUser.signup_mode) {
        return;
      }

      try {
        const baseURL = import.meta.env.VITE_API_BASE_URL;
        if (!baseURL) {
          throw new Error("VITE_API_BASE_URL 환경변수가 설정되지 않았습니다.");
        }
        const response = await fetch(`${baseURL}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.user) {
            const userData = data.data.user;
            const userMode = userData.preferred_mode || "normal";
            // 기존 user가 있으면 signup_mode만 업데이트, 없으면 전체 업데이트
            setUser((prevUser) => {
              if (prevUser && !prevUser.signup_mode) {
                return { ...prevUser, signup_mode: userData.signup_mode };
              } else {
                return userData;
              }
            });
            if (!currentUser) {
              setMode(userMode);
            }
          } else {
            // 토큰이 유효하지 않으면 토큰 제거
            safeSessionStorage.removeItem("token");
          }
        } else {
          // 토큰이 유효하지 않으면 토큰 제거
          safeSessionStorage.removeItem("token");
        }
      } catch (error) {
        console.error("자동 로그인 실패:", error);
        safeSessionStorage.removeItem("token");
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 초기 마운트 시 한 번만 실행

  // 로그인(또는 자동 로그인)으로 user가 설정되면 서버에서 사용자 설정을 가져와 적용
  useEffect(() => {
    const loadUserSettings = async () => {
      const token = safeSessionStorage.getItem("token");

      // 토큰이 없거나 유효하지 않으면 (null, undefined, 빈 문자열, 공백만 있는 경우) 조기 반환
      if (!user || !token || typeof token !== "string" || token.trim() === "") {
        return;
      }

      try {
        const baseURL = import.meta.env.VITE_API_BASE_URL;
        if (!baseURL) {
          throw new Error("VITE_API_BASE_URL 환경변수가 설정되지 않았습니다.");
        }
        const response = await fetch(`${baseURL}/users/me/settings`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.warn("설정 로드 실패: 서버 응답 오류");
          return;
        }

        const settingsData = await response.json();
        // 서버에서 저장된 설정 값으로 적용 (글자 크기)
        if (settingsData.fontScale) {
          setFontScale(settingsData.fontScale);
        }
        // 다크 모드는 기기(sessionStorage) 기준으로 유지하므로
        // 서버 값으로 덮어쓰지 않는다.
      } catch (settingsError) {
        console.error("설정 로드 실패:", settingsError);
      }
    };

    // user가 있으면 서버에서 설정 로드 (초기 마운트 시에도 실행)
    if (user) {
      loadUserSettings();
    }
  }, [user]); // user가 변경될 때마다 실행 (초기 마운트 시 user가 이미 있으면 실행됨)

  const login = (userData, selectedMode) => {
    setUser(userData);
    setMode(selectedMode);
  };

  const logout = () => {
    setUser(null);
    setMode(null);
    safeSessionStorage.removeItem("user");
    safeSessionStorage.removeItem("appMode");
    safeSessionStorage.removeItem("token");
  };

  const switchMode = (newMode) => {
    setMode(newMode);
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const updateFontScale = (newFontScale) => {
    setFontScale(newFontScale);
  };

  return (
    <AppContext.Provider
      value={{
        mode,
        user,
        isDarkMode,
        fontScale,
        login,
        logout,
        switchMode,
        toggleDarkMode,
        updateFontScale,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};
