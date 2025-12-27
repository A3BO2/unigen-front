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
import { getReel } from "../../services/post";

const baseURL = import.meta.env.VITE_BASE_URL;

// 이미지 URL을 절대 경로로 변환하는 함수
const getImageUrl = (url) => {
  if (!url) return null;
  // 이미 http:// 또는 https://로 시작하면 그대로 반환
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // 상대 경로면 baseURL 붙이기
  return `${baseURL}${url}`;
};

const Profile = () => {
  const { user, logout, isDarkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [activeTab, setActiveTab] = useState("feed"); // "feed" or "reels"
  const [hasMore, setHasMore] = useState(true);
  const [hasMoreReels, setHasMoreReels] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingReels, setIsLoadingReels] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [containerWidth, setContainerWidth] = useState(1000);
  const observerRef = useRef();
  const lastPostRef = useRef();
  const lastReelRef = useRef();
  const isLoadingRef = useRef(false);
  const isLoadingReelsRef = useRef(false);
  const pageRef = useRef(1);
  const reelPageRef = useRef(1);
  const slideContainerRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const dragStartX = useRef(0);
  const dragOffsetRef = useRef(0);

  // 프로필 데이터 로드 (피드)
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
        // post_type이 정확히 'feed'인 것만 필터링 (reel은 제외)
        const feedPosts = data.posts.filter(
          (post) => {
            // 디버깅: post_type이 feed가 아닌 항목 확인
            if (post.post_type !== "feed") {
              console.warn("게시물 피드에 포함되지 않은 항목:", {
                id: post.id,
                post_type: post.post_type,
                video_url: post.video_url ? "있음" : "없음"
              });
            }
            return post.post_type === "feed";
          }
        );
        
        if (pageNum === 1) {
          setPosts(feedPosts);
        } else {
          setPosts((prev) => [...prev, ...feedPosts]);
        }

        // pagination 정보로 hasMore 결정
        if (data.pagination) {
          setHasMore(data.pagination.has_next);
        } else {
          // pagination 정보가 없으면 posts 길이로 판단
          setHasMore(feedPosts.length >= 9);
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

  // 모든 릴스 데이터 한번에 로드
  const loadAllReels = useCallback(async () => {
    if (isLoadingReelsRef.current) {
      return;
    }

    isLoadingReelsRef.current = true;
    setIsLoadingReels(true);
    setError(null);

    try {
      let allReels = [];
      let currentPage = 1;
      let hasMore = true;

      // 모든 페이지를 순차적으로 로드
      while (hasMore) {
        const data = await getCurrentUser(currentPage, 9);

        if (data?.posts) {
          // post_type이 'reel'인 것만 필터링
          const reelPosts = data.posts.filter((post) => post.post_type === "reel");
          allReels = [...allReels, ...reelPosts];

          // pagination 정보로 hasMore 결정
          if (data.pagination) {
            hasMore = data.pagination.has_next;
          } else {
            hasMore = reelPosts.length >= 9;
          }
        } else {
          hasMore = false;
        }

        currentPage++;
      }

      setReels(allReels);
      setHasMoreReels(false); // 모든 릴스를 로드했으므로 더 이상 없음
    } catch (err) {
      console.error("릴스 로드 실패:", err);
      setError(err.message || "릴스를 불러오는데 실패했습니다.");
      setHasMoreReels(false);
    } finally {
      isLoadingReelsRef.current = false;
      setIsLoadingReels(false);
    }
  }, []);

  // 릴스 데이터 로드 (getCurrentUser에서 가져온 데이터 활용) - 무한 스크롤용
  const loadReelsData = useCallback(async (pageNum) => {
    if (isLoadingReelsRef.current) {
      return;
    }

    isLoadingReelsRef.current = true;
    setIsLoadingReels(true);
    setError(null);

    try {
      // 페이지 2부터만 1초 딜레이 추가
      if (pageNum > 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const data = await getCurrentUser(pageNum, 9);

      if (data?.posts) {
        // post_type이 'reel'인 것만 필터링
        const reelPosts = data.posts.filter((post) => post.post_type === "reel");
        
        if (pageNum === 1) {
          setReels(reelPosts);
        } else {
          setReels((prev) => [...prev, ...reelPosts]);
        }

        // pagination 정보로 hasMoreReels 결정
        if (data.pagination) {
          setHasMoreReels(data.pagination.has_next);
        } else {
          setHasMoreReels(reelPosts.length >= 9);
        }
      } else {
        setHasMoreReels(false);
      }
    } catch (err) {
      console.error("릴스 로드 실패:", err);
      setError(err.message || "릴스를 불러오는데 실패했습니다.");
      setHasMoreReels(false);
    } finally {
      isLoadingReelsRef.current = false;
      setIsLoadingReels(false);
    }
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    loadProfileData(1);
  }, [loadProfileData]);

  // 컨테이너 너비 계산
  useEffect(() => {
    const updateWidth = () => {
      if (slideContainerRef.current) {
        setContainerWidth(slideContainerRef.current.offsetWidth);
      }
    };
    
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // 릴스 초기 로드 - 모든 릴스를 한번에 로드
  useEffect(() => {
    if (activeTab === "reels" && reels.length === 0 && !isLoadingReels) {
      loadAllReels();
    }
  }, [activeTab, reels.length, isLoadingReels, loadAllReels]);

  // 무한 스크롤 Intersection Observer 설정 (피드)
  useEffect(() => {
    if (activeTab !== "feed" || isLoading || !hasMore) {
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
  }, [activeTab, isLoading, hasMore, loadProfileData]);

  // 무한 스크롤 Intersection Observer 설정 (릴스)
  useEffect(() => {
    if (activeTab !== "reels" || isLoadingReels || !hasMoreReels) {
      return;
    }

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting && hasMoreReels && !isLoadingReelsRef.current) {
          reelPageRef.current = reelPageRef.current + 1;
          loadReelsData(reelPageRef.current);
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      }
    );

    if (lastReelRef.current) {
      observerRef.current.observe(lastReelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [activeTab, isLoadingReels, hasMoreReels, loadReelsData]);

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

  // 터치 시작
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    dragStartX.current = touch.clientX;
    setIsDragging(true);
    dragOffsetRef.current = 0;
    setDragOffset(0);
  };

  // 터치 이동
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const currentX = touch.clientX;
    const diff = currentX - dragStartX.current;
    dragOffsetRef.current = diff;
    setDragOffset(diff);
  };

  // 터치 종료
  const handleTouchEnd = (e) => {
    if (!isDragging) return;
    const touch = e.changedTouches[0];
    touchEndX.current = touch.clientX;
    setIsDragging(false);
    
    const swipeDistance = touchEndX.current - touchStartX.current;
    const minSwipeDistance = 80; // 최소 스와이프 거리

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0 && activeTab === "reels") {
        // 오른쪽으로 스와이프 -> 피드로
        setActiveTab("feed");
      } else if (swipeDistance < 0 && activeTab === "feed") {
        // 왼쪽으로 스와이프 -> 릴스로
        setActiveTab("reels");
      }
    }
    
    dragOffsetRef.current = 0;
    setDragOffset(0);
  };

  // 마우스 드래그 시작
  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragStartX.current = e.clientX;
    setIsDragging(true);
    dragOffsetRef.current = 0;
    setDragOffset(0);
  };

  // 마우스 드래그 이동 및 종료 (전역 이벤트)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const diff = e.clientX - dragStartX.current;
      dragOffsetRef.current = diff;
      setDragOffset(diff);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      
      const swipeDistance = dragOffsetRef.current;
      const minSwipeDistance = 80;

      if (Math.abs(swipeDistance) > minSwipeDistance) {
        if (swipeDistance > 0 && activeTab === "reels") {
          setActiveTab("feed");
        } else if (swipeDistance < 0 && activeTab === "feed") {
          setActiveTab("reels");
        }
      }
      
      dragOffsetRef.current = 0;
      setDragOffset(0);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, activeTab]);

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
                    backgroundImage: `url(${getImageUrl(
                      profileData.profile_image
                    )})`,
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

          {/* 탭 버튼 */}
          <TabContainer $darkMode={isDarkMode}>
            <TabButton
              $active={activeTab === "feed"}
              onClick={() => setActiveTab("feed")}
              $darkMode={isDarkMode}
            >
              게시물
            </TabButton>
            <TabButton
              $active={activeTab === "reels"}
              onClick={() => setActiveTab("reels")}
              $darkMode={isDarkMode}
            >
              릴스
            </TabButton>
          </TabContainer>

          {error && <ErrorMessage $darkMode={isDarkMode}>{error}</ErrorMessage>}

          {/* 슬라이드 컨테이너 */}
          <SwipeableContainer
            ref={slideContainerRef}
            $activeTab={activeTab}
            $isDragging={isDragging}
            $dragOffset={dragOffset}
            $containerWidth={containerWidth}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
          >
            <SlideContainer
              $activeTab={activeTab}
              $isDragging={isDragging}
              $dragOffset={dragOffset}
              $containerWidth={containerWidth}
            >
            {/* 피드 탭 */}
            <TabContent>
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
                          ? `url(${getImageUrl(post.image_url)})`
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

              {isLoading && activeTab === "feed" && (
                <LoadingContainer $darkMode={isDarkMode}>
                  <Spinner />
                  <LoadingMessage $darkMode={isDarkMode}>
                    불러오는 중...
                  </LoadingMessage>
                </LoadingContainer>
              )}

              {!hasMore && posts.length > 0 && activeTab === "feed" && (
                <EndMessage $darkMode={isDarkMode}>
                  모든 게시물을 불러왔습니다.
                </EndMessage>
              )}
            </TabContent>

            {/* 릴스 탭 */}
            <TabContent>
              {reels.length > 0 ? (
                <PostGrid>
                  {reels.map((reel, index) => (
                    <GridItem
                      key={reel.id || index}
                      ref={index === reels.length - 1 ? lastReelRef : null}
                    >
                      <PostImage
                        style={{
                          backgroundImage: reel.image_url
                            ? `url(${getImageUrl(reel.image_url)})`
                            : "none",
                          backgroundColor: !reel.image_url
                            ? `hsl(${index * 40}, 70%, 80%)`
                            : "transparent",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />
                      {reel.video_url && (
                        <VideoIndicator $darkMode={isDarkMode}>▶</VideoIndicator>
                      )}
                    </GridItem>
                  ))}
                </PostGrid>
              ) : null}

              {isLoadingReels && activeTab === "reels" && (
                <LoadingContainer $darkMode={isDarkMode}>
                  <Spinner />
                  <LoadingMessage $darkMode={isDarkMode}>
                    불러오는 중...
                  </LoadingMessage>
                </LoadingContainer>
              )}

              {!hasMoreReels && reels.length > 0 && activeTab === "reels" && (
                <EndMessage $darkMode={isDarkMode}>
                  모든 릴스를 불러왔습니다.
                </EndMessage>
              )}
            </TabContent>
            </SlideContainer>
          </SwipeableContainer>
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

const TabContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 120px;
  margin-top: 0;
  border-top: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  position: relative;
`;

const TabButton = styled.button`
  padding: 16px 24px;
  background: transparent;
  border: none;
  font-size: 14px;
  font-weight: ${(props) => (props.$active ? "600" : "500")};
  color: ${(props) =>
    props.$active
      ? props.$darkMode
        ? "#fff"
        : "#262626"
      : props.$darkMode
      ? "#8e8e8e"
      : "#8e8e8e"};
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease-in-out;
  border-radius: 8px;
  margin-top: -1px;

  &::after {
    content: "";
    position: absolute;
    bottom: -1px;
    left: 50%;
    transform: translateX(-50%);
    width: ${(props) => (props.$active ? "100%" : "0%")};
    height: 2px;
    background: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
    transition: width 0.3s ease-in-out;
    border-radius: 2px 2px 0 0;
  }

  &:hover {
    color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
    background: ${(props) =>
      props.$darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)"};
  }

  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 767px) {
    gap: 80px;
    padding: 14px 20px;
    font-size: 13px;
  }
`;

const SwipeableContainer = styled.div`
  position: relative;
  overflow: hidden;
  width: 100%;
  cursor: ${(props) => (props.$isDragging ? "grabbing" : "grab")};
  user-select: none;
  touch-action: pan-x;
  -webkit-overflow-scrolling: touch;
`;

const SlideContainer = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  transition: ${(props) =>
    props.$isDragging ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"};
  transform: ${(props) => {
    const baseTranslate = props.$activeTab === "feed" ? 0 : -100;
    
    if (props.$isDragging && Math.abs(props.$dragOffset) > 0) {
      // 드래그 중일 때는 실시간으로 오프셋 적용
      const dragPercent = (props.$dragOffset / props.$containerWidth) * 100;
      const newTranslate = baseTranslate + dragPercent;
      // 최대/최소 제한 (-100% ~ 0%)
      const clampedTranslate = Math.max(-100, Math.min(0, newTranslate));
      return `translateX(${clampedTranslate}%)`;
    }
    
    return `translateX(${baseTranslate}%)`;
  }};
`;

const TabContent = styled.div`
  min-width: 100%;
  width: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  touch-action: pan-x;
  -webkit-overflow-scrolling: touch;
`;

const VideoIndicator = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
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
