import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import styled from "styled-components";

const baseURL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

const RightSidebar = () => {
  const navigate = useNavigate();
  const { user, isDarkMode, switchMode } = useApp();

  const handleSwitchMode = () => {
    if (confirm("시니어 모드로 전환하시겠습니까?")) {
      switchMode("senior");
      navigate("/senior/home");
    }
  };

  // profile_image 처리: http:// 또는 https://로 시작하는 URL은 그대로 사용
  const profileImageUrl = (() => {
    const imageUrl = user?.profile_image;
    if (!imageUrl) return null;

    const urlString = String(imageUrl).trim();
    if (urlString === "") return null;

    // http:// 또는 https://로 시작하면 그대로 반환
    if (urlString.startsWith("http://") || urlString.startsWith("https://")) {
      return urlString;
    }

    // 상대 경로면 baseURL 붙이기
    return `${baseURL}${urlString}`;
  })();

  return (
    <Container $darkMode={isDarkMode}>
      <UserProfile>
        <Avatar onClick={() => navigate("/normal/profile")}>
          {profileImageUrl ? (
            <img src={profileImageUrl} alt={user?.username || "프로필"} />
          ) : (
            <DefaultAvatar $darkMode={isDarkMode}>
              <span>👤</span>
            </DefaultAvatar>
          )}
        </Avatar>
        <UserInfo onClick={() => navigate("/normal/profile")}>
          <Username $darkMode={isDarkMode}>
            {user?.username || "username"}
          </Username>
          <Name $darkMode={isDarkMode}>{user?.name || "username"}</Name>
        </UserInfo>
        <SwitchButton onClick={handleSwitchMode}>전환</SwitchButton>
      </UserProfile>

      <Divider $darkMode={isDarkMode} />

      <AdvertisementSection $darkMode={isDarkMode}>
        <AdvertisementImage
          src="/advertisement1.png"
          alt="광고 1"
          onClick={() =>
            window.open("https://ryuzyproject.tistory.com/", "_blank")
          }
          $clickable={true}
        />
        <AdvertisementImage
          src="/advertisement2.png"
          alt="광고 2"
          $clickable={false}
        />
      </AdvertisementSection>

      <Footer>
        <Copyright $darkMode={isDarkMode}>© 2025 UNIGEN FROM A3BO2</Copyright>
      </Footer>
    </Container>
  );
};

const Container = styled.aside`
  position: fixed;
  right: 0;
  top: 0;
  width: 335px;
  height: 100vh;
  padding: 36px 20px 20px 20px;
  overflow-y: auto;
  background: ${(props) => (props.$darkMode ? "#000" : "white")};
  border-left: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};

  @media (max-width: 1264px) {
    display: none; /* 태블릿 및 모바일은 숨김 (대안 UI 사용) */
  }

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 1264px) {
    display: none;
  }
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
`;

const Avatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const DefaultAvatar = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: ${(props) => (props.$darkMode ? "#262626" : "#fafafa")};
  border: 1px solid ${(props) => (props.$darkMode ? "#363636" : "#dbdbdb")};
  border-radius: 50%;

  span {
    font-size: 24px;
  }
`;

const UserInfo = styled.div`
  flex: 1;
  cursor: pointer;
`;

const Username = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const Name = styled.div`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
`;

const SwitchButton = styled.button`
  font-size: 12px;
  font-weight: 600;
  color: #0095f6;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;

  &:hover {
    color: #00376b;
  }
`;

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  margin: 24px 0;
`;

const AdvertisementSection = styled.div`
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const AdvertisementImage = styled.img`
  width: 100%;
  height: auto;
  border-radius: 8px;
  cursor: ${(props) => (props.$clickable ? "pointer" : "default")};
  transition: transform 0.2s, opacity 0.2s;

  &:hover {
    transform: scale(1.02);
    opacity: 0.9;
  }
`;

const Footer = styled.footer`
  margin-top: 32px;
`;

const Copyright = styled.div`
  font-size: 11px;
  color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#c7c7c7")};
`;

export default RightSidebar;
