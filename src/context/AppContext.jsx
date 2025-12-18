import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

// 안전한 localStorage 접근 함수
const safeLocalStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('localStorage access denied:', error);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('localStorage write denied:', error);
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('localStorage remove denied:', error);
    }
  }
};

export const AppProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    // 로컬 스토리지에서 모드 불러오기
    return safeLocalStorage.getItem('appMode') || null;
  });

  const [user, setUser] = useState(() => {
    // 로컬 스토리지에서 유저 정보 불러오기
    const savedUser = safeLocalStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    // 로컬 스토리지에서 다크모드 상태 불러오기
    const savedDarkMode = safeLocalStorage.getItem('isDarkMode');
    return savedDarkMode === 'true' ? true : false;
  });

  useEffect(() => {
    if (mode) {
      safeLocalStorage.setItem('appMode', mode);
    }
  }, [mode]);

  useEffect(() => {
    if (user) {
      safeLocalStorage.setItem('user', JSON.stringify(user));
    } else {
      safeLocalStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    safeLocalStorage.setItem('isDarkMode', isDarkMode.toString());
  }, [isDarkMode]);

  // 토큰 기반 자동 로그인 (앱 시작 시)
  useEffect(() => {
    const checkAuth = async () => {
      const token = safeLocalStorage.getItem('token');
      if (token && !user) {
        // 토큰이 있고 사용자 정보가 없으면 서버에서 사용자 정보 가져오기
        try {
          const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
          const response = await fetch(`${baseURL}/auth/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data?.user) {
              const userData = data.data.user;
              const userMode = userData.preferred_mode || 'normal';
              setUser(userData);
              setMode(userMode);
            } else {
              // 토큰이 유효하지 않으면 토큰 제거
              safeLocalStorage.removeItem('token');
            }
          } else {
            // 토큰이 유효하지 않으면 토큰 제거
            safeLocalStorage.removeItem('token');
          }
        } catch (error) {
          console.error('자동 로그인 실패:', error);
          safeLocalStorage.removeItem('token');
        }
      }
    };

    checkAuth();
  }, []); // 초기 마운트 시 한 번만 실행

  const login = (userData, selectedMode) => {
    setUser(userData);
    setMode(selectedMode);
  };

  const logout = () => {
    setUser(null);
    setMode(null);
    safeLocalStorage.removeItem('user');
    safeLocalStorage.removeItem('appMode');
    safeLocalStorage.removeItem('token');
  };

  const switchMode = (newMode) => {
    setMode(newMode);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <AppContext.Provider value={{
      mode,
      user,
      isDarkMode,
      login,
      logout,
      switchMode,
      toggleDarkMode
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
