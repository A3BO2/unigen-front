import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { ThemeProvider } from 'styled-components';
import { ChevronLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import SeniorBottomNav from '../../components/senior/BottomNav';
import { logoutWithKakao } from '../../utils/kakaoAuth';

const fontOptions = [
  { value: 'small', label: '작게', description: '많은 내용을 한 화면에서 보고 싶을 때' },
  { value: 'medium', label: '보통', description: '기본 글씨 크기' },
  { value: 'large', label: '크게', description: '글씨를 더 크게 보고 싶을 때' }
];

const Settings = () => {
  const navigate = useNavigate();
  const { logout, isDarkMode, toggleDarkMode, user } = useApp();
  const [fontSize, setFontSize] = useState('medium');
  const [notificationsOn, setNotificationsOn] = useState(true);

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
    <ThemeProvider theme={{ $darkMode: isDarkMode }}>
      <Container $darkMode={isDarkMode}>
        <Header $darkMode={isDarkMode}>
          <BackButton onClick={() => navigate('/senior/profile')}>
            <ChevronLeft size={32} strokeWidth={2.5} />
          </BackButton>
          <Title>설정</Title>
          <Spacer />
        </Header>

        <Content>
          <Section>
            <SectionTitle>글자 크기</SectionTitle>
            <FontOptions>
              {fontOptions.map(option => (
                <FontOptionButton
                  key={option.value}
                  onClick={() => setFontSize(option.value)}
                  $active={fontSize === option.value}
                >
                  <FontOptionLabel>{option.label}</FontOptionLabel>
                  <FontOptionDesc>{option.description}</FontOptionDesc>
                </FontOptionButton>
              ))}
            </FontOptions>
          </Section>

          <Section>
            <SectionTitle>알림</SectionTitle>
            <SettingItem onClick={() => setNotificationsOn(!notificationsOn)}>
              <SettingLabel>알림 받기</SettingLabel>
              <Toggle $active={notificationsOn}>
                <ToggleCircle $active={notificationsOn} />
              </Toggle>
            </SettingItem>
          </Section>

          <Section>
            <SectionTitle>화면</SectionTitle>
            <SettingItem onClick={toggleDarkMode}>
              <SettingLabel>다크 모드</SettingLabel>
              <Toggle $active={isDarkMode}>
                <ToggleCircle $active={isDarkMode} />
              </Toggle>
            </SettingItem>
          </Section>

          <Section>
            <HelpBox>
              <HelpText>
                가족이나 보호자에게 QR 코드를 보여주면 설정을 함께 할 수 있어요.
              </HelpText>
              <HelpButton onClick={() => navigate('/senior/help')}>
                도우미 요청하기
              </HelpButton>
            </HelpBox>
          </Section>

          <Section>
            <LogoutButton onClick={handleLogout}>
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
  font-size: 32px;
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

const Section = styled.div`
  margin-bottom: 40px;
`;

const SectionTitle = styled.h2`
  font-size: 24px;
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
  font-size: 22px;
  font-weight: 700;
  color: ${props => props.theme.$darkMode ? '#f5f5f5' : '#1f1f1f'};
`;

const FontOptionDesc = styled.div`
  font-size: 16px;
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
  font-size: 22px;
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
  font-size: 18px;
  line-height: 1.5;
  color: ${props => props.theme.$darkMode ? '#ddd' : '#555'};
  margin-bottom: 16px;
`;

const HelpButton = styled.button`
  width: 100%;
  padding: 18px;
  font-size: 22px;
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
  font-size: 22px;
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
