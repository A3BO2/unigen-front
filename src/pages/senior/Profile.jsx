import { useState, useEffect, useRef, useCallback } from "react";
import styled, { ThemeProvider } from "styled-components";
import { useApp } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import SeniorBottomNav from "../../components/senior/BottomNav";
import {
  getUserSettings,
  getSeniorCurrentUser,
  getFollowers,
  getFollowing,
} from "../../services/user";
import { logoutWithKakao } from "../../utils/kakaoAuth";

const baseURL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

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
  const { user, isDarkMode, logout, switchMode } = useApp();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    fontScale: "large",
    seniorSimpleMode: true,
    language: "ko",
  });
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [error, setError] = useState(null);
  const observerRef = useRef();
  const lastPostRef = useRef();
  const isLoadingRef = useRef(false);
  const pageRef = useRef(1);
  const [isFollowListOpen, setIsFollowListOpen] = useState(false);
  const [followListType, setFollowListType] = useState(null); // "followers" or "following"
  const [followList, setFollowList] = useState([]);
  const [filteredFollowList, setFilteredFollowList] = useState([]);
  const [isLoadingFollowList, setIsLoadingFollowList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 프로필 데이터 로드
  const loadProfileData = useCallback(async (pageNum) => {
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoadingPosts(true);
    setError(null);

    try {
      // 페이지 2부터만 1초 딜레이 추가 (첫 페이지는 즉시 로드)
      if (pageNum > 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const data = await getSeniorCurrentUser(pageNum, 9);

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
      const errorMessage = err.message || "프로필을 불러오는데 실패했습니다.";
      setError(errorMessage);
      setHasMore(false);

      // 네트워크 오류인 경우 추가 정보 표시
      if (err.message.includes("네트워크") || err.message.includes("연결")) {
        console.error("네트워크 오류 발생. 서버가 실행 중인지 확인해주세요.");
      }
    } finally {
      isLoadingRef.current = false;
      setIsLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const data = await getUserSettings();
        setSettings(data);
      } catch (error) {
        console.error("설정 조회 실패:", error);
        // 에러 발생 시 기본값 유지
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    loadProfileData(1);
  }, [loadProfileData]);

  // 무한 스크롤 Intersection Observer 설정
  useEffect(() => {
    if (isLoadingPosts || !hasMore) {
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
  }, [isLoadingPosts, hasMore, loadProfileData]);

  // 일반 모드로 전환 핸들러
  const handleSwitchToNormal = () => {
    if (confirm("일반 모드로 전환하시겠습니까?")) {
      // 로컬 상태 업데이트
      switchMode("normal");
      // 일반 모드 홈으로 이동
      navigate("/normal/home");
    }
  };

  // 로그아웃 핸들러
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

  // 팔로우/팔로워 목록 토글
  const handleFollowClick = async (type) => {
    // 같은 타입을 클릭하면 닫기
    if (isFollowListOpen && followListType === type) {
      setIsFollowListOpen(false);
      setFollowListType(null);
      setFollowList([]);
      return;
    }

    // 다른 타입이거나 처음 열 때
    setIsFollowListOpen(true);
    setFollowListType(type);
    setIsLoadingFollowList(true);
    setFollowList([]);

    try {
      let data;
      if (type === "followers") {
        data = await getFollowers();
        const followers = data.followers || [];
        setFollowList(followers);
        setFilteredFollowList(followers);
      } else if (type === "following") {
        data = await getFollowing();
        const following = data.following || [];
        setFollowList(following);
        setFilteredFollowList(following);
      }
    } catch (err) {
      console.error("팔로우/팔로워 목록 로드 실패:", err);
      setError(err.message || "목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoadingFollowList(false);
    }
  };

  // 팔로우/팔로워 모달 닫기
  const handleCloseFollowModal = () => {
    setIsFollowListOpen(false);
    setFollowListType(null);
    setFollowList([]);
    setFilteredFollowList([]);
    setSearchQuery("");
    document.body.style.overflow = "";
  };

  // 모달 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (isFollowListOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isFollowListOpen]);

  // 검색 필터링
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFollowList(followList);
    } else {
      const filtered = followList.filter((user) => {
        const name = (user.name || user.username || "").toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query);
      });
      setFilteredFollowList(filtered);
    }
  }, [searchQuery, followList]);

  return (
    <ThemeProvider theme={{ $darkMode: isDarkMode }}>
      <Container>
        <Header>
          <Title>내 정보</Title>
          <EditButton
            $fontSize={settings.fontScale}
            onClick={() => navigate("/senior/profile/edit")}
          >
            설정 수정
          </EditButton>
        </Header>

        <ProfileSection>
          <Avatar>
            {profileData?.profile_image ? (
              <AvatarImage
                src={getImageUrl(profileData.profile_image)}
                alt="프로필 이미지"
              />
            ) : user?.profile_image ? (
              <AvatarImage
                src={getImageUrl(user.profile_image)}
                alt="프로필 이미지"
              />
            ) : (
              "👤"
            )}
          </Avatar>
          <Name>
            {profileData?.name ||
              user?.name ||
              profileData?.username ||
              user?.username ||
              "사용자"}
          </Name>
        </ProfileSection>

        <Stats>
          <Stat
            onClick={() => handleFollowClick("followers")}
            style={{ cursor: "pointer" }}
          >
            <StatNumber $fontSize={settings.fontScale}>
              {profileData?.follower_count || 0}
            </StatNumber>
            <StatLabel $fontSize={settings.fontScale}>
              내 이야기 보는 친구
            </StatLabel>
          </Stat>
          <Stat
            onClick={() => handleFollowClick("following")}
            style={{ cursor: "pointer" }}
          >
            <StatNumber $fontSize={settings.fontScale}>
              {profileData?.following_count || 0}
            </StatNumber>
            <StatLabel $fontSize={settings.fontScale}>
              내가 보고 있는 친구
            </StatLabel>
          </Stat>
        </Stats>

        <QuickActions>
          <QuickActionButton onClick={() => navigate("/senior/settings")}>
            <ActionTitle>글자 크기 설정</ActionTitle>
            <ActionDescription>
              {!loading && (
                <>
                  글씨 크기:{" "}
                  {settings.fontScale === "small"
                    ? "작게"
                    : settings.fontScale === "medium"
                    ? "보통"
                    : "크게"}
                </>
              )}
              {loading && "글씨 크기를 조절해요"}
            </ActionDescription>
          </QuickActionButton>
          <QuickActionButton onClick={handleSwitchToNormal}>
            <ActionTitle>일반 모드로 전환</ActionTitle>
            <ActionDescription>
              더 많은 기능을 사용할 수 있는 일반 모드로 전환해요
            </ActionDescription>
          </QuickActionButton>
          <LogoutButton $fontSize={settings.fontScale} onClick={handleLogout}>
            로그아웃
          </LogoutButton>
        </QuickActions>

        <SectionHeader>
          내가 남긴 이야기 {profileData?.post_count || posts.length}개
        </SectionHeader>

        <ContentSection>
          {error && (
            <ErrorMessage>
              {error}
              {error.includes("네트워크") || error.includes("연결") ? (
                <ErrorSubText>
                  백엔드 서버가 실행 중인지 확인해주세요.
                </ErrorSubText>
              ) : null}
            </ErrorMessage>
          )}

          {posts.length === 0 && !isLoadingPosts && !error && (
            <EmptyMessage>게시물이 없습니다.</EmptyMessage>
          )}

          {posts.map((post, index) => (
            <Post
              key={post.id || index}
              ref={index === posts.length - 1 ? lastPostRef : null}
              onClick={() => navigate(`/senior/post/${post.id}`)}
            >
              <PostHeader>
                <UserInfo>
                  <PostAvatar>
                    {profileData?.profile_image ? (
                      <PostAvatarImage
                        src={getImageUrl(profileData.profile_image)}
                        alt={profileData.username || "프로필"}
                      />
                    ) : (
                      "👤"
                    )}
                  </PostAvatar>
                  <UserDetails>
                    <Username>
                      {profileData?.name ||
                        user?.name ||
                        profileData?.username ||
                        user?.username ||
                        "나"}
                    </Username>
                    <Timestamp>
                      {post.created_at
                        ? new Date(post.created_at).toLocaleDateString(
                            "ko-KR",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )
                        : ""}
                    </Timestamp>
                  </UserDetails>
                </UserInfo>
              </PostHeader>

              {post.content && <Content>{post.content}</Content>}

              {post.image_url && (
                <PostImage
                  src={getImageUrl(post.image_url)}
                  alt="게시물 사진"
                />
              )}

              <PostStats>
                <StatText>좋아요 {post.like_count || 0}개</StatText>
                <StatText>댓글 {post.comment_count || 0}개</StatText>
              </PostStats>
            </Post>
          ))}

          {isLoadingPosts && (
            <LoadingContainer>
              <Spinner />
              <LoadingMessage>불러오는 중...</LoadingMessage>
            </LoadingContainer>
          )}

          {!hasMore && posts.length > 0 && (
            <EndMessage>모든 게시물을 불러왔습니다.</EndMessage>
          )}
        </ContentSection>

        <SeniorBottomNav />

        {/* 팔로우/팔로워 모달 */}
        {isFollowListOpen && (
          <FollowModalOverlay
            onClick={handleCloseFollowModal}
            $darkMode={isDarkMode}
          >
            <FollowModalContainer
              onClick={(e) => e.stopPropagation()}
              $darkMode={isDarkMode}
            >
              <FollowModalHeader $darkMode={isDarkMode}>
                <FollowModalTitle
                  $darkMode={isDarkMode}
                  $fontSize={settings.fontScale}
                >
                  {followListType === "followers"
                    ? "내 이야기 보는 친구"
                    : "내가 보고 있는 친구"}
                </FollowModalTitle>
                <FollowModalCloseButton
                  onClick={handleCloseFollowModal}
                  $darkMode={isDarkMode}
                >
                  ✕
                </FollowModalCloseButton>
              </FollowModalHeader>

              <FollowSearchBar $darkMode={isDarkMode}>
                <FollowSearchInput
                  type="text"
                  placeholder="검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  $darkMode={isDarkMode}
                  $fontSize={settings.fontScale}
                />
              </FollowSearchBar>

              <FollowListContent $darkMode={isDarkMode}>
                {isLoadingFollowList ? (
                  <LoadingContainer>
                    <LoadingText
                      $darkMode={isDarkMode}
                      $fontSize={settings.fontScale}
                    >
                      불러오는 중...
                    </LoadingText>
                  </LoadingContainer>
                ) : filteredFollowList.length > 0 ? (
                  <FollowList>
                    {filteredFollowList.map((userItem) => (
                      <FollowListItem key={userItem.id} $darkMode={isDarkMode}>
                        <FollowUserAvatar>
                          {userItem.profile_image ? (
                            <img
                              src={getImageUrl(userItem.profile_image)}
                              alt={userItem.username || "사용자"}
                            />
                          ) : (
                            <AvatarPlaceholder>👤</AvatarPlaceholder>
                          )}
                        </FollowUserAvatar>
                        <FollowUserInfo>
                          <FollowUsername
                            $darkMode={isDarkMode}
                            $fontSize={settings.fontScale}
                          >
                            {userItem.name || userItem.username || "알 수 없음"}
                          </FollowUsername>
                        </FollowUserInfo>
                      </FollowListItem>
                    ))}
                  </FollowList>
                ) : (
                  <EmptyFollowList
                    $darkMode={isDarkMode}
                    $fontSize={settings.fontScale}
                  >
                    {followListType === "followers"
                      ? "내 이야기를 보는 친구가 없습니다."
                      : "내가 보고 있는 친구가 없습니다."}
                  </EmptyFollowList>
                )}
              </FollowListContent>
            </FollowModalContainer>
          </FollowModalOverlay>
        )}
      </Container>
    </ThemeProvider>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: ${(props) => (props.theme.$darkMode ? "#000" : "#fff")};
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  padding-bottom: 100px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  background: ${(props) => (props.theme.$darkMode ? "#000" : "#fff")};
  border-bottom: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
`;

const Title = styled.h1`
  font-size: calc(32px * var(--font-scale, 1));
  font-weight: 700;
`;

const EditButton = styled.button`
  padding: ${({ $fontSize }) =>
    $fontSize === "small"
      ? "10px 16px"
      : $fontSize === "large"
      ? "14px 24px"
      : "12px 20px"};
  border-radius: 12px;
  border: 2px solid #0095f6;
  background: #0095f6;
  color: #fff;
  font-size: ${({ $fontSize }) =>
    $fontSize === "small" ? "14px" : $fontSize === "large" ? "20px" : "17px"};
  font-weight: 700;
  transition: all 0.2s;

  &:active {
    opacity: 0.85;
    transform: scale(0.98);
  }

  &:hover {
    background: #0084d9;
    border-color: #0084d9;
  }
`;

const ProfileSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px;
  border-bottom: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
`;

const Avatar = styled.div`
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#f5f5f5")};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 100px;
  margin-bottom: 16px;
  border: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  overflow: hidden;
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
`;

const Name = styled.h2`
  font-size: calc(28px * var(--font-scale, 1));
  font-weight: 700;
  margin-bottom: 8px;
`;

const QuickActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
  padding-bottom: 24px;
`;

const QuickActionButton = styled.button`
  width: 100%;
  padding: 20px;
  border-radius: 16px;
  background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#f5f5f5")};
  border: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  text-align: left;
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;
  gap: 6px;

  &:active {
    transform: scale(0.98);
  }
`;

const ActionTitle = styled.span`
  font-size: calc(22px * var(--font-scale, 1));
  font-weight: 700;
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#222")};
`;

const ActionDescription = styled.span`
  font-size: calc(16px * var(--font-scale, 1));
  color: ${(props) => (props.theme.$darkMode ? "#bbb" : "#666")};
`;

const SectionHeader = styled.h2`
  font-size: calc(24px * var(--font-scale, 1));
  font-weight: 700;
  padding: 0 24px;
  margin-bottom: 16px;
`;

const ContentSection = styled.div`
  padding: 0;
`;

const Post = styled.article`
  border-bottom: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  padding: 28px;
  transition: background 0.2s;
  cursor: pointer;

  &:active {
    background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#f5f5f5")};
  }
`;

const PostHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
`;

const UserInfo = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
`;

const PostAvatar = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#f5f5f5")};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(32px * var(--font-scale, 1));
  flex-shrink: 0;
  border: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  overflow: hidden;
`;

const PostAvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Username = styled.span`
  font-size: calc(24px * var(--font-scale, 1));
  font-weight: 700;
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
`;

const Timestamp = styled.span`
  font-size: calc(18px * var(--font-scale, 1));
  color: ${(props) => (props.theme.$darkMode ? "#999" : "#666")};
`;

const Content = styled.p`
  font-size: calc(24px * var(--font-scale, 1));
  line-height: 1.7;
  margin-bottom: 24px;
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  word-break: keep-all;
`;

const PostImage = styled.img`
  width: 100%;
  border-radius: 16px;
  margin-bottom: 24px;
  object-fit: cover;
  max-height: 500px;
`;

const PostStats = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
`;

const StatText = styled.span`
  font-size: calc(18px * var(--font-scale, 1));
  color: ${(props) => (props.theme.$darkMode ? "#999" : "#666")};
  font-weight: 500;
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 20px;
  margin: 20px 24px;
  background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#fff3cd")};
  border: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#ffc107")};
  border-radius: 12px;
  color: ${(props) => (props.theme.$darkMode ? "#ff6b6b" : "#e74c3c")};
  font-size: calc(18px * var(--font-scale, 1));
  font-weight: 600;
`;

const ErrorSubText = styled.div`
  margin-top: 8px;
  font-size: calc(16px * var(--font-scale, 1));
  color: ${(props) => (props.theme.$darkMode ? "#999" : "#666")};
  font-weight: 400;
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${(props) => (props.theme.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  font-size: calc(18px * var(--font-scale, 1));
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
  border-top-color: #ffb703;
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
  color: ${(props) => (props.theme.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  font-size: calc(16px * var(--font-scale, 1));
  font-weight: 500;
`;

const LoadingText = styled.div`
  text-align: center;
  color: ${(props) => (props.theme.$darkMode ? "#999" : "#666")};
  font-size: ${({ $fontSize }) =>
    $fontSize === "small"
      ? "calc(14px * var(--font-scale, 1))"
      : $fontSize === "large"
      ? "calc(20px * var(--font-scale, 1))"
      : "calc(17px * var(--font-scale, 1))"};
  font-weight: 500;
`;

const EndMessage = styled.div`
  text-align: center;
  padding: 40px 20px 50px;
  color: ${(props) => (props.theme.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  font-size: calc(16px * var(--font-scale, 1));
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 20px;
  background: #ff4458;
  color: white;
  font-size: ${({ $fontSize }) =>
    $fontSize === "small" ? "14px" : $fontSize === "large" ? "22px" : "18px"};
  font-weight: 700;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0;

  &:active {
    transform: scale(0.98);
    background: #e63946;
  }
`;

const Stats = styled.div`
  display: flex;
  justify-content: space-around;
  padding: 24px;
  border-bottom: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:active {
    opacity: 0.7;
  }
`;

const StatNumber = styled.span`
  font-size: ${({ $fontSize }) =>
    $fontSize === "small"
      ? "calc(20px * var(--font-scale, 1))"
      : $fontSize === "large"
      ? "calc(28px * var(--font-scale, 1))"
      : "calc(24px * var(--font-scale, 1))"};
  font-weight: 700;
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
`;

const StatLabel = styled.span`
  font-size: ${({ $fontSize }) =>
    $fontSize === "small"
      ? "calc(14px * var(--font-scale, 1))"
      : $fontSize === "large"
      ? "calc(20px * var(--font-scale, 1))"
      : "calc(17px * var(--font-scale, 1))"};
  color: ${(props) => (props.theme.$darkMode ? "#999" : "#666")};
  text-align: center;
`;

const FollowModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const FollowModalContainer = styled.div`
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#fff")};
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const FollowModalHeader = styled.div`
  padding: 24px;
  border-bottom: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
`;

const FollowModalTitle = styled.h2`
  font-size: ${({ $fontSize }) =>
    $fontSize === "small"
      ? "calc(18px * var(--font-scale, 1))"
      : $fontSize === "large"
      ? "calc(26px * var(--font-scale, 1))"
      : "calc(22px * var(--font-scale, 1))"};
  font-weight: 700;
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  margin: 0;
`;

const FollowModalCloseButton = styled.button`
  position: absolute;
  top: 50%;
  right: 24px;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  font-size: 24px;
  transition: background 0.2s;
  padding: 0;

  &:active {
    background: ${(props) =>
      props.$darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
  }
`;

const FollowSearchBar = styled.div`
  padding: 16px 24px;
  border-bottom: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#fff")};
  flex-shrink: 0;
`;

const FollowSearchInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  background: ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#f5f5f5")};
  border: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  border-radius: 12px;
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  font-size: ${({ $fontSize }) =>
    $fontSize === "small"
      ? "calc(14px * var(--font-scale, 1))"
      : $fontSize === "large"
      ? "calc(20px * var(--font-scale, 1))"
      : "calc(17px * var(--font-scale, 1))"};

  &::placeholder {
    color: ${(props) => (props.theme.$darkMode ? "#999" : "#999")};
  }

  &:focus {
    outline: none;
    border-color: #0095f6;
  }
`;

const FollowListContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#fff")};
  min-height: 0;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#fff")};
  }

  &::-webkit-scrollbar-thumb {
    background: ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#dbdbdb")};
    border-radius: 4px;
  }
`;

const FollowList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  width: 100%;
`;

const FollowListItem = styled.li`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  transition: background 0.2s;
  width: 100%;
  box-sizing: border-box;

  &:active {
    background: ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#f5f5f5")};
  }
`;

const FollowUserAvatar = styled.div`
  width: 56px;
  height: 56px;
  min-width: 56px;
  min-height: 56px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const FollowUserInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const FollowUsername = styled.span`
  font-size: ${({ $fontSize }) =>
    $fontSize === "small"
      ? "calc(16px * var(--font-scale, 1))"
      : $fontSize === "large"
      ? "calc(22px * var(--font-scale, 1))"
      : "calc(19px * var(--font-scale, 1))"};
  font-weight: 700;
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  line-height: 1.4;
`;

const EmptyFollowList = styled.div`
  text-align: center;
  padding: 60px 24px;
  color: ${(props) => (props.theme.$darkMode ? "#999" : "#666")};
  font-size: ${({ $fontSize }) =>
    $fontSize === "small"
      ? "calc(14px * var(--font-scale, 1))"
      : $fontSize === "large"
      ? "calc(20px * var(--font-scale, 1))"
      : "calc(17px * var(--font-scale, 1))"};
`;

const AvatarPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
`;

export default Profile;
