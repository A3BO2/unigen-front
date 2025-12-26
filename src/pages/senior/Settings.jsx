import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { ThemeProvider } from 'styled-components';
import { ChevronLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import SeniorBottomNav from '../../components/senior/BottomNav';
import { logoutWithKakao } from '../../utils/kakaoAuth';
import { getUserSettings, updateUserSettings } from '../../services/user';

const fontOptions = [
  { value: 'small', label: '작게', description: '많은 내용을 한 화면에서 보고 싶을 때' },
  { value: 'medium', label: '보통', description: '기본 글씨 크기' },
  { value: 'large', label: '크게', description: '글씨를 더 크게 보고 싶을 때' }
];

const Settings = () => {
  const navigate = useNavigate();
  const { logout, isDarkMode, toggleDarkMode, user, fontScale, updateFontScale } = useApp();
  const [fontSize, setFontSize] = useState(fontScale || 'large');
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState(null);

  // 전역 fontScale 이 바뀌면 로컬 상태도 동기화 (다른 화면에서 변경된 경우 대비)
  useEffect(() => {
    if (fontScale) {
      setFontSize(fontScale);
    }
  }, [fontScale]);

  // 현재 선택된 글자 크기에 따른 스케일 값 (이 페이지에 확실히 적용되도록 로컬에서도 CSS 변수 세팅)
  const localScaleMap = {
    small: 0.8,
    medium: 1,
    large: 1.5,
  };
  const currentScale = localScaleMap[fontSize] || 1;

  // 초기 설정 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getUserSettings();

        // 1) 이 페이지 로컬 상태만 초기화 (서버 값 기준)
        setFontSize(settings.fontScale || 'large');
        setNotificationsOn(
          settings.notificationsOn !== undefined ? settings.notificationsOn : true
        );

        // 2) 전역 컨텍스트는 "처음 진입했을 때만" 맞춰 주고,
        //    이후에는 사용자가 버튼으로 바꾼 값은 덮어쓰지 않는다.
        if (!fontScale && settings.fontScale) {
          updateFontScale(settings.fontScale);
        }
      } catch (error) {
        console.error('설정 로드 실패:', error);
      }
    };
    loadSettings();
    // fontScale은 조건문 안에서만 참고하므로 의존성에서 제외해, 한 번만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateFontScale]);

  // 폰트 크기 변경 핸들러
  const handleFontSizeChange = async (newFontSize) => {
    // 동일한 값이면 저장하지 않음
    if (newFontSize === fontSize) return;
    
    // 이전 값 저장
    const previousFontSize = fontSize;
    
    setFontSize(newFontSize);
    updateFontScale(newFontSize);
    
    // 서버에 저장
    try {
      setLoading(true);
      const result = await updateUserSettings({ fontScale: newFontSize });
      console.log('폰트 크기 저장 성공:', result);
    } catch (error) {
      console.error('설정 저장 실패:', error);
      // 실패 시 원래 값으로 복구
      setFontSize(previousFontSize);
      updateFontScale(previousFontSize);
      alert('설정 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 알림 설정 변경 핸들러
  const handleNotificationsChange = async () => {
    const newValue = !notificationsOn;
    setNotificationsOn(newValue);
    
    // 서버에 저장
    try {
      setLoading(true);
      await updateUserSettings({ notificationsOn: newValue });
    } catch (error) {
      console.error('설정 저장 실패:', error);
      // 실패 시 원래 값으로 복구
      setNotificationsOn(notificationsOn);
    } finally {
      setLoading(false);
    }
  };

  // 정각 알림 (매시간, 시간대에 따라 다른 메시지) 스케줄링
  useEffect(() => {
    if (!notificationsOn) return;

    const timeouts = [];

    const getMessageForHour = (hour) => {
      if (hour === 6) return "좋은 아침입니다! 아침 6시입니다.";
      if (hour === 12) return "안녕하세요, 점심 12시입니다. 밥 먹고 올까요?";
      if (hour === 20) return "좋은 저녁입니다. 저녁 8시입니다.";
      if (hour === 0) return "안녕히 주무세요. 자정 12시입니다.";
      return `지금은 ${hour}시 정각입니다.`;
    };

    const scheduleNextHour = () => {
      const now = new Date();
      const next = new Date();
      next.setMinutes(0, 0, 0);
      // 이미 정각을 지난 경우 다음 정각(다음 시간)으로
      if (next <= now) {
        next.setHours(next.getHours() + 1);
      }

      const delay = next.getTime() - now.getTime();

      const timeoutId = window.setTimeout(() => {
        const currentHour = new Date().getHours();
        const msg = getMessageForHour(currentHour);
        // 1) 화면 상단에 5분 동안 표시
        setNotificationMessage(msg);
        window.setTimeout(() => {
          setNotificationMessage((prev) => (prev === msg ? null : prev));
        }, 5 * 60 * 1000);
        // 다음 시간 정각 예약
        scheduleNextHour();
      }, delay);

      timeouts.push(timeoutId);
    };

    scheduleNextHour();

    // cleanup: 알림 끄거나 컴포넌트 언마운트 시 타이머 제거
    return () => {
      timeouts.forEach((id) => clearTimeout(id));
    };
  }, [notificationsOn]);

  // 다크 모드 변경 핸들러
  const handleDarkModeChange = () => {
    // 전역 AppContext의 다크 모드 상태만 토글
    // (다크 모드는 기기/브라우저 기준으로 관리하고 서버에는 저장하지 않음)
    toggleDarkMode();
  };

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      // 카카오 로그인을 사용한 경우 카카오 로그아웃도 처리
      if (user?.signup_mode === 'kakao') {
        logoutWithKakao();
      }
      logout();
      navigate('/');
    }
  };

  return (
    // 이 페이지에서는 테마 + 로컬 상태로 글자 크기를 확실하게 반영
    <ThemeProvider theme={{ $darkMode: isDarkMode, $fontScale: currentScale }}>
      <Container $darkMode={isDarkMode} $fontSize={fontSize}>
        <Header $darkMode={isDarkMode}>
          <BackButton onClick={() => navigate('/senior/profile')}>
            <ChevronLeft size={32} strokeWidth={2.5} />
          </BackButton>
          <Title $fontSize={fontSize}>설정</Title>
          <Spacer />
        </Header>

        <Content>
          {notificationMessage && (
            <NotificationBar $darkMode={isDarkMode}>
              <NotificationText>{notificationMessage}</NotificationText>
            </NotificationBar>
          )}
          <Section>
            <SectionTitle $fontSize={fontSize}>글자 크기</SectionTitle>
            <FontOptions>
              {fontOptions.map(option => (
                <FontOptionButton
                  key={option.value}
                  onClick={() => handleFontSizeChange(option.value)}
                  $active={fontSize === option.value}
                  disabled={loading}
                >
                  <FontOptionLabel $fontSize={fontSize}>{option.label}</FontOptionLabel>
                  <FontOptionDesc $fontSize={fontSize}>{option.description}</FontOptionDesc>
                </FontOptionButton>
              ))}
            </FontOptions>
          </Section>

          <Section>
            <SectionTitle $fontSize={fontSize}>알림</SectionTitle>
            <SettingItem onClick={handleNotificationsChange} style={{ opacity: loading ? 0.6 : 1 }}>
              <SettingLabel $fontSize={fontSize}>알림 받기</SettingLabel>
              <Toggle $active={notificationsOn}>
                <ToggleCircle $active={notificationsOn} />
              </Toggle>
            </SettingItem>
          </Section>

          <Section>
            <SectionTitle $fontSize={fontSize}>화면</SectionTitle>
            <SettingItem onClick={handleDarkModeChange} style={{ opacity: loading ? 0.6 : 1 }}>
              <SettingLabel $fontSize={fontSize}>다크 모드</SettingLabel>
              <Toggle $active={isDarkMode}>
                <ToggleCircle $active={isDarkMode} />
              </Toggle>
            </SettingItem>
          </Section>

          <Section>
            <HelpBox>
              <HelpText $fontSize={fontSize}>
                가족이나 보호자에게 QR 코드를 보여주면 설정을 함께 할 수 있어요.
              </HelpText>
              <HelpButton $fontSize={fontSize} onClick={() => navigate('/senior/help')}>
                도우미 요청하기
              </HelpButton>
            </HelpBox>
          </Section>

          <Section>
            <LogoutButton $fontSize={fontSize} onClick={handleLogout}>
              로그아웃
            </LogoutButton>
          </Section>
        </Content>

        <SeniorBottomNav />
      </Container>
    </ThemeProvider>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.$darkMode ? '#000' : '#fff'};
  color: ${props => props.$darkMode ? '#fff' : '#000'};
  padding-bottom: 80px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  background: ${props => props.$darkMode ? '#000' : '#fff'};
  border-bottom: 2px solid ${props => props.$darkMode ? '#2a2a2a' : '#e0e0e0'};
  padding: 20px 24px;
  display: flex;
  align-items: center;
  z-index: 10;
`;

const BackButton = styled.button`
  color: inherit;
  padding: 4px;

  &:active {
    opacity: 0.6;
  }
`;

const Title = styled.h1`
  font-size: ${({ $fontSize }) =>
    $fontSize === 'small' ? '20px' : $fontSize === 'large' ? '34px' : '26px'};
  font-weight: 700;
  flex: 1;
  text-align: center;
`;

const Spacer = styled.div`
  width: 40px;
`;

const Content = styled.div`
  padding: 24px;
`;

// 정각 알림 바
const NotificationBar = styled.div`
  margin: 0 0 16px 0;
  padding: 14px 16px;
  border-radius: 12px;
  background: ${props => props.$darkMode ? '#1a1a1a' : '#e3f2fd'};
  border: 2px solid ${props => props.$darkMode ? '#2a2a2a' : '#2196f3'};
`;

const NotificationText = styled.p`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.$darkMode ? '#bbdefb' : '#0d47a1'};
`;

const Section = styled.div`
  margin-bottom: 40px;
`;

const SectionTitle = styled.h2`
  font-size: ${({ $fontSize }) =>
    $fontSize === 'small' ? '14px' : $fontSize === 'large' ? '26px' : '20px'};
  font-weight: 700;
  margin-bottom: 16px;
  padding: 0 8px;
`;

const FontOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FontOptionButton = styled.button`
  width: 100%;
  padding: 20px;
  border-radius: 16px;
  border: 2px solid ${props => props.$active ? '#0095f6' : (props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0')};
  background: ${props => props.$active ? 'rgba(0,149,246,0.1)' : (props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5')};
  text-align: left;
  color: ${props => props.theme.$darkMode ? '#f5f5f5' : '#1f1f1f'};

  &:active {
    transform: scale(0.98);
  }
`;

const FontOptionLabel = styled.div`
  font-size: ${({ $fontSize }) =>
    $fontSize === 'small' ? '14px' : $fontSize === 'large' ? '22px' : '18px'};
  font-weight: 700;
  color: ${props => props.theme.$darkMode ? '#f5f5f5' : '#1f1f1f'};
`;

const FontOptionDesc = styled.div`
  font-size: ${({ $fontSize }) =>
    $fontSize === 'small' ? '11px' : $fontSize === 'large' ? '16px' : '14px'};
  color: ${props => props.theme.$darkMode ? '#d6d6d6' : '#555'};
  margin-top: 6px;
`;

const SettingItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px;
  background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
  border-radius: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};

  &:active {
    transform: scale(0.98);
    background: ${props => props.theme.$darkMode ? '#0a0a0a' : '#e8e8e8'};
  }
`;

const SettingLabel = styled.span`
  font-size: ${({ $fontSize }) =>
    $fontSize === 'small' ? '14px' : $fontSize === 'large' ? '22px' : '18px'};
  font-weight: 600;
`;

const HelpBox = styled.div`
  padding: 24px;
  border-radius: 16px;
  background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
  border: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
  text-align: center;
`;

const HelpText = styled.p`
  font-size: ${({ $fontSize }) =>
    $fontSize === 'small' ? '12px' : $fontSize === 'large' ? '18px' : '15px'};
  line-height: 1.5;
  color: ${props => props.theme.$darkMode ? '#ddd' : '#555'};
  margin-bottom: 16px;
`;

const HelpButton = styled.button`
  width: 100%;
  padding: 18px;
  font-size: ${({ $fontSize }) =>
    $fontSize === 'small' ? '14px' : $fontSize === 'large' ? '22px' : '18px'};
  font-weight: 700;
  border-radius: 12px;
  background: #ffb703;
  color: #000;

  &:active {
    opacity: 0.85;
  }
`;

const Toggle = styled.div`
  width: 56px;
  height: 32px;
  border-radius: 16px;
  background: ${props => props.$active ? '#0095f6' : '#d0d0d0'};
  position: relative;
  transition: background 0.3s;
  cursor: pointer;
`;

const ToggleCircle = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: white;
  position: absolute;
  top: 2px;
  left: ${props => props.$active ? '26px' : '2px'};
  transition: left 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 20px;
  background: #ff4458;
  color: white;
  font-size: ${({ $fontSize }) =>
    $fontSize === 'small' ? '14px' : $fontSize === 'large' ? '22px' : '18px'};
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:active {
    transform: scale(0.98);
    background: #e63946;
  }
`;

export default Settings;
