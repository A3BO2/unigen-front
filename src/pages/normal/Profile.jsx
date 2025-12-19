import { useState, useEffect, useRef, useCallback } from "react";
import styled from "styled-components";
import { Settings, Moon, Sun } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import LeftSidebar from "../../components/normal/LeftSidebar";
import RightSidebar from "../../components/normal/RightSidebar";
import BottomNav from "../../components/normal/BottomNav";
import { getCurrentUser } from "../../services/user";
import { logoutWithKakao } from "../../utils/kakaoAuth";

const Profile = () => {
  const { user, logout, isDarkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const observerRef = useRef();
  const lastPostRef = useRef();
  const isLoadingRef = useRef(false);
  const pageRef = useRef(1);

  // 프로필 데이터 로드
  const loadProfileData = useCallback(async (pageNum) => {
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // 페이지 2부터만 1초 딜레이 추가 (첫 페이지는 즉시 로드)
      if (pageNum > 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const data = await getCurrentUser(pageNum, 9);

      // 백엔드 응답 형식: { profile, posts, pagination }
      if (data?.profile) {
        setProfileData(data.profile);
      }

      if (data?.posts) {
        if (pageNum === 1) {
          setPosts(data.posts);
        } else {
          setPosts((prev) => [...prev, ...data.posts]);
        }

        // pagination 정보로 hasMore 결정
        if (data.pagination) {
          setHasMore(data.pagination.has_next);
        } else {
          // pagination 정보가 없으면 posts 길이로 판단
          setHasMore(data.posts.length >= 9);
        }
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("프로필 로드 실패:", err);
      setError(err.message || "프로필을 불러오는데 실패했습니다.");
      setHasMore(false);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    loadProfileData(1);
  }, [loadProfileData]);

  // 무한 스크롤 Intersection Observer 설정
  useEffect(() => {
    if (isLoading || !hasMore) {
      return;
    }

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting && hasMore && !isLoadingRef.current) {
          pageRef.current = pageRef.current + 1;
          loadProfileData(pageRef.current);
        }
      },
      {
        root: null,
        rootMargin: "100px", // 바닥에서 100px 위에서 미리 로드
        threshold: 0.1, // 10% 보이면 트리거
      }
    );

    if (lastPostRef.current) {
      observerRef.current.observe(lastPostRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoading, hasMore, loadProfileData]);

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

  const handleSettingsToggle = () => {
    setIsMoreOpen(!isMoreOpen);
  };

  return (
    <>
      <LeftSidebar />
      <RightSidebar />
      <BottomNav />

      <Container $darkMode={isDarkMode}>
        <MainContent $darkMode={isDarkMode}>
          <ProfileHeader>
            <ProfilePicture>
              {profileData?.profile_image ? (
                <Avatar
                  style={{
                    backgroundImage: `url(${profileData.profile_image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              ) : (
                <Avatar>👤</Avatar>
              )}
            </ProfilePicture>

            <ProfileDetails>
              <TopRow>
                <Username $darkMode={isDarkMode}>
                  {profileData?.name || "사용자명"}
                </Username>
                <ActionButtons>
                  <EditButton
                    onClick={() => navigate("/normal/profile/edit")}
                    $darkMode={isDarkMode}
                  >
                    프로필 편집
                  </EditButton>
                  <SettingsButtonWrapper>
                    <SettingsButton
                      onClick={handleSettingsToggle}
                      $darkMode={isDarkMode}
                    >
                      <Settings
                        size={24}
                        color={isDarkMode ? "#fff" : "#262626"}
                      />
                    </SettingsButton>
                    {isMoreOpen && (
                      <SettingsMenu $darkMode={isDarkMode}>
                        <SettingsMenuItem
                          onClick={() => {
                            navigate("/normal/settings");
                            setIsMoreOpen(false);
                          }}
                          $darkMode={isDarkMode}
                        >
                          <Settings
                            size={20}
                            color={isDarkMode ? "#fff" : "#262626"}
                          />
                          <MenuLabel $darkMode={isDarkMode}>설정</MenuLabel>
                        </SettingsMenuItem>

                        <SettingsMenuItem
                          onClick={() => {
                            toggleDarkMode();
                            setIsMoreOpen(false);
                          }}
                          $darkMode={isDarkMode}
                        >
                          {isDarkMode ? (
                            <Moon size={20} color="#fff" />
                          ) : (
                            <Sun size={20} color="#262626" />
                          )}
                          <MenuLabel $darkMode={isDarkMode}>
                            모드 전환
                          </MenuLabel>
                        </SettingsMenuItem>

                        <SettingsMenuItem
                          onClick={() => {
                            handleLogout();
                            setIsMoreOpen(false);
                          }}
                          $darkMode={isDarkMode}
                        >
                          <MenuLabel $darkMode={isDarkMode}>로그아웃</MenuLabel>
                        </SettingsMenuItem>
                      </SettingsMenu>
                    )}
                  </SettingsButtonWrapper>
                </ActionButtons>
              </TopRow>

              <Stats>
                <Stat>
                  <StatNumber $darkMode={isDarkMode}>
                    {profileData?.post_count || 0}
                  </StatNumber>
                  <StatLabel $darkMode={isDarkMode}>게시물</StatLabel>
                </Stat>
                <Stat>
                  <StatNumber $darkMode={isDarkMode}>
                    {profileData?.follower_count || 0}
                  </StatNumber>
                  <StatLabel $darkMode={isDarkMode}>팔로워</StatLabel>
                </Stat>
                <Stat>
                  <StatNumber $darkMode={isDarkMode}>
                    {profileData?.following_count || 0}
                  </StatNumber>
                  <StatLabel $darkMode={isDarkMode}>팔로우</StatLabel>
                </Stat>
              </Stats>
            </ProfileDetails>
          </ProfileHeader>

          <Divider $darkMode={isDarkMode} />

          {error && <ErrorMessage $darkMode={isDarkMode}>{error}</ErrorMessage>}

          <PostGrid>
            {posts.length === 0 && !isLoading && (
              <EmptyMessage $darkMode={isDarkMode}>
                게시물이 없습니다.
              </EmptyMessage>
            )}

            {posts.map((post, index) => (
              <GridItem
                key={post.id || index}
                ref={index === posts.length - 1 ? lastPostRef : null}
              >
                <PostImage
                  style={{
                    backgroundImage: post.image_url
                      ? `url(${post.image_url})`
                      : "none",
                    backgroundColor: !post.image_url
                      ? `hsl(${index * 40}, 70%, 80%)`
                      : "transparent",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              </GridItem>
            ))}
          </PostGrid>

          {isLoading && (
            <LoadingContainer $darkMode={isDarkMode}>
              <Spinner />
              <LoadingMessage $darkMode={isDarkMode}>
                불러오는 중...
              </LoadingMessage>
            </LoadingContainer>
          )}

          {!hasMore && posts.length > 0 && (
            <EndMessage $darkMode={isDarkMode}>
              모든 게시물을 불러왔습니다.
            </EndMessage>
          )}
        </MainContent>
      </Container>
    </>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: ${(props) => (props.$darkMode ? "#000" : "#fafafa")};

  @media (min-width: 1264px) {
    margin-left: 335px;
    margin-right: 335px;
    display: flex;
    justify-content: center;
  }

  @media (max-width: 1264px) and (min-width: 768px) {
    margin-left: 72px;
  }

  @media (max-width: 767px) {
    padding-bottom: 60px;
  }
`;

const MainContent = styled.main`
  width: 100%;
  max-width: 935px;
  margin: 0 auto;
  padding: 30px 20px;
  background: ${(props) => (props.$darkMode ? "#000" : "white")};
  min-height: 100vh;

  @media (min-width: 768px) {
    padding: 30px 20px;
  }
`;

const ProfileHeader = styled.div`
  display: flex;
  margin-bottom: 44px;
  gap: 30px;

  @media (min-width: 768px) {
    gap: 80px;
  }

  @media (max-width: 767px) {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
`;

const ProfilePicture = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;

  @media (min-width: 768px) {
    margin-left: 60px;
  }
`;

const Avatar = styled.div`
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: #fafafa;
  border: 1px solid #dbdbdb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80px;
  cursor: pointer;

  @media (max-width: 767px) {
    width: 86px;
    height: 86px;
    font-size: 48px;
  }
`;

const ProfileDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (max-width: 767px) {
    width: 100%;
    align-items: flex-start;
  }
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;

  @media (max-width: 767px) {
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    width: 100%;
    gap: 12px;
  }
`;

const Username = styled.h1`
  font-size: 20px;
  font-weight: 400;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};

  @media (max-width: 767px) {
    font-size: 18px;
    flex-shrink: 0;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;

  @media (max-width: 767px) {
    margin-left: auto;
    flex-wrap: nowrap;
    justify-content: flex-end;
  }
`;

const EditButton = styled.button`
  padding: 7px 16px;
  background: ${(props) => (props.$darkMode ? "#262626" : "#efefef")};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  cursor: pointer;
  transition: all 0.2s;
  outline: none;
  border: none;

  &:hover {
    background: ${(props) => (props.$darkMode ? "#1a1a1a" : "#dbdbdb")};
  }
`;

const StoryButton = styled.button`
  padding: 7px 16px;
  background: ${(props) => (props.$darkMode ? "#262626" : "#efefef")};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${(props) => (props.$darkMode ? "#1a1a1a" : "#dbdbdb")};
  }
`;

const SettingsButtonWrapper = styled.div`
  position: relative;
`;

const SettingsButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  cursor: pointer;
  transition: opacity 0.2s;
  outline: none;
  border: none;
  background: transparent;

  &:hover {
    opacity: 0.6;
  }
`;

const SettingsMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: ${(props) => (props.$darkMode ? "#262626" : "white")};
  border: 1px solid ${(props) => (props.$darkMode ? "#3a3a3a" : "#dbdbdb")};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  z-index: 1000;
  overflow: hidden;
`;

const SettingsMenuItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${(props) => (props.$darkMode ? "#1a1a1a" : "#fafafa")};
  }

  &:not(:last-child) {
    border-bottom: 1px solid
      ${(props) => (props.$darkMode ? "#3a3a3a" : "#dbdbdb")};
  }
`;

const MenuLabel = styled.span`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const Stats = styled.div`
  display: flex;
  gap: 40px;

  @media (max-width: 767px) {
    width: 100%;
    justify-content: space-between;
    gap: 16px;
  }
`;

const Stat = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;

  @media (max-width: 767px) {
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
`;

const StatNumber = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const StatLabel = styled.span`
  font-size: 16px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const Divider = styled.div`
  height: 1px;
  background: ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  margin-bottom: 0;
`;

const PostGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding-top: 4px;
`;

const GridItem = styled.div`
  aspect-ratio: 1;
  cursor: pointer;
  overflow: hidden;

  &:hover {
    opacity: 0.8;
  }
`;

const PostImage = styled.div`
  width: 100%;
  height: 100%;
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 20px;
  color: ${(props) => (props.$darkMode ? "#ff6b6b" : "#e74c3c")};
  font-size: 14px;
`;

const EmptyMessage = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px 20px;
  color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  font-size: 16px;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 16px;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid rgba(142, 142, 142, 0.3);
  border-top-color: #0095f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  font-size: 14px;
  font-weight: 500;
`;

const EndMessage = styled.div`
  text-align: center;
  padding: 20px;
  color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  font-size: 14px;
`;

export default Profile;
