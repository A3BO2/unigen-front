import { useNavigate } from "react-router-dom";
import { useState } from "react";
import styled from "styled-components";
import { ChevronRight, Moon, Sun, User } from "lucide-react";
import LeftSidebar from "../../components/normal/LeftSidebar";
import RightSidebar from "../../components/normal/RightSidebar";
import BottomNav from "../../components/normal/BottomNav";
import { useApp } from "../../context/AppContext";
import { logoutWithKakao } from "../../utils/kakaoAuth";
import { updateUserSettings } from "../../services/user";

const Settings = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode, switchMode, logout, user } = useApp();
  const [loading, setLoading] = useState(false);

  const handleDarkModeToggle = async () => {
    const newValue = !isDarkMode;
    // 로컬 UI 먼저 반영
    toggleDarkMode();

    try {
      setLoading(true);
      await updateUserSettings({ isDarkMode: newValue });
    } catch (error) {
      console.error("다크 모드 설정 저장 실패:", error);
      // 실패해도 로컬 다크 모드 상태는 그대로 둔다
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = () => {
    switchMode("senior");
    navigate("/senior/home");
  };

  const handleLogout = () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      // 카카오 로그인을 사용한 경우 카카오 로그아웃도 처리
      if (user?.signup_mode === "kakao") {
        logoutWithKakao();
      }
      logout();
      navigate("/");
    }
  };

  return (
    <>
      <LeftSidebar />
      <RightSidebar />
      <BottomNav />

      <Container $darkMode={isDarkMode}>
        <Header $darkMode={isDarkMode}>
          <Title $darkMode={isDarkMode}>설정</Title>
        </Header>

        <Content $darkMode={isDarkMode}>
          <Section>
            <SectionTitle $darkMode={isDarkMode}>일반</SectionTitle>

            <SettingItem $darkMode={isDarkMode} onClick={handleModeSwitch}>
              <SettingLeft>
                <IconWrapper $darkMode={isDarkMode}>
                  <User size={20} />
                </IconWrapper>
                <SettingLabel $darkMode={isDarkMode}>
                  시니어 모드 전환
                </SettingLabel>
              </SettingLeft>
              <ChevronRight
                size={20}
                color={isDarkMode ? "#8e8e8e" : "#8e8e8e"}
              />
            </SettingItem>

            <SettingItem
              $darkMode={isDarkMode}
              onClick={handleDarkModeToggle}
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              <SettingLeft>
                <IconWrapper $darkMode={isDarkMode}>
                  {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                </IconWrapper>
                <SettingLabel $darkMode={isDarkMode}>다크 모드</SettingLabel>
              </SettingLeft>
              <Toggle $active={isDarkMode}>
                <ToggleCircle $active={isDarkMode} />
              </Toggle>
            </SettingItem>
          </Section>

          <Section>
            <SectionTitle $darkMode={isDarkMode}>계정 및 보안</SectionTitle>

            <SettingItem
              $darkMode={isDarkMode}
              onClick={() => navigate("/change-password")}
            >
              <SettingLeft>
                <SettingLabel $darkMode={isDarkMode}>
                  비밀번호 변경
                </SettingLabel>
              </SettingLeft>
              <ChevronRight
                size={20}
                color={isDarkMode ? "#8e8e8e" : "#8e8e8e"}
              />
            </SettingItem>

            <SettingItem
              $darkMode={isDarkMode}
              onClick={() => navigate("/account/security")}
            >
              <SettingLeft>
                <SettingLabel $darkMode={isDarkMode}>보안</SettingLabel>
              </SettingLeft>
              <ChevronRight
                size={20}
                color={isDarkMode ? "#8e8e8e" : "#8e8e8e"}
              />
            </SettingItem>

            <SettingItem
              $darkMode={isDarkMode}
              onClick={() => navigate("/account/notifications")}
            >
              <SettingLeft>
                <SettingLabel $darkMode={isDarkMode}>알림 설정</SettingLabel>
              </SettingLeft>
              <ChevronRight
                size={20}
                color={isDarkMode ? "#8e8e8e" : "#8e8e8e"}
              />
            </SettingItem>
          </Section>

          <Section>
            <SectionTitle $darkMode={isDarkMode}>정보</SectionTitle>

            <SettingItem
              $darkMode={isDarkMode}
              onClick={() => navigate("/about")}
            >
              <SettingLeft>
                <SettingLabel $darkMode={isDarkMode}>앱 정보</SettingLabel>
              </SettingLeft>
              <ChevronRight
                size={20}
                color={isDarkMode ? "#8e8e8e" : "#8e8e8e"}
              />
            </SettingItem>

            <SettingItem
              $darkMode={isDarkMode}
              onClick={() => navigate("/help")}
            >
              <SettingLeft>
                <SettingLabel $darkMode={isDarkMode}>도움말</SettingLabel>
              </SettingLeft>
              <ChevronRight
                size={20}
                color={isDarkMode ? "#8e8e8e" : "#8e8e8e"}
              />
            </SettingItem>
          </Section>

          <Section>
            <LogoutButton onClick={handleLogout}>로그아웃</LogoutButton>
          </Section>
        </Content>
      </Container>
    </>
  );
};

const Container = styled.div`
  margin-left: 335px;
  margin-right: 335px;
  min-height: 100vh;
  background: ${(props) => (props.$darkMode ? "#000" : "#fafafa")};
  padding: 0 20px;

  @media (max-width: 1264px) {
    margin-left: 72px;
  }

  @media (max-width: 767px) {
    margin-left: 0;
    margin-right: 0;
    padding-bottom: 60px;
  }
`;

const Header = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 30px 0 20px;
  border-bottom: 1px solid
    ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  background: ${(props) => (props.$darkMode ? "#000" : "white")};
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const Content = styled.div`
  max-width: 600px;
  margin: 0 auto;
  background: ${(props) => (props.$darkMode ? "#000" : "white")};
  padding: 20px 0;
`;

const Section = styled.div`
  margin-bottom: 32px;
`;

const SectionTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  padding: 16px 20px 8px;
`;

const SettingItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${(props) => (props.$darkMode ? "#1a1a1a" : "#fafafa")};
  }

  &:active {
    background: ${(props) => (props.$darkMode ? "#262626" : "#efefef")};
  }
`;

const SettingLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const SettingLabel = styled.span`
  font-size: 16px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const Toggle = styled.div`
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: ${(props) => (props.$active ? "#0095f6" : "#dbdbdb")};
  position: relative;
  transition: background 0.3s;
  cursor: pointer;
`;

const ToggleCircle = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  position: absolute;
  top: 2px;
  left: ${(props) => (props.$active ? "22px" : "2px")};
  transition: left 0.3s;
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 12px 20px;
  color: #ed4956;
  font-size: 16px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #fafafa;
  }

  &:active {
    background: #efefef;
  }
`;

export default Settings;
