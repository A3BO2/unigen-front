import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import {
  Home,
  Search,
  Compass,
  Film,
  PlusSquare,
  User,
  Menu,
  X,
  Settings,
  Moon,
  Sun,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { logoutWithKakao } from "../../utils/kakaoAuth";
import {
  searchUsers,
  followUser,
  unfollowUser,
  isFollowing,
} from "../../services/user";

const STORAGE_KEY = "searchHistory";

const LeftSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode, logout, user } = useApp();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // 검색 관련 state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [followStatuses, setFollowStatuses] = useState({});
  const [followLoading, setFollowLoading] = useState({});

  const baseURL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

  // sessionStorage에서 검색 기록 로드
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const history = JSON.parse(stored);
        setSearchHistory(history);
      }
    } catch (error) {
      console.error("검색 기록 로드 실패:", error);
    }
  }, []);

  // 검색 기록 저장 함수
  const saveToHistory = (query) => {
    if (!query || query.trim().length === 0) return;

    const trimmedQuery = query.trim();
    try {
      let history = [];
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        history = JSON.parse(stored);
      }

      // 중복 제거 (같은 검색어가 있으면 맨 앞으로 이동)
      history = history.filter((item) => item !== trimmedQuery);
      history.unshift(trimmedQuery);

      // 최대 10개만 저장
      history = history.slice(0, 10);

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      setSearchHistory(history);
    } catch (error) {
      console.error("검색 기록 저장 실패:", error);
    }
  };

  // 검색 기록 삭제
  const removeFromHistory = (queryToRemove, e) => {
    e.stopPropagation();
    try {
      const history = searchHistory.filter((item) => item !== queryToRemove);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      setSearchHistory(history);
    } catch (error) {
      console.error("검색 기록 삭제 실패:", error);
    }
  };

  // 검색 기록 전체 삭제
  const clearAllHistory = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      setSearchHistory([]);
    } catch (error) {
      console.error("검색 기록 전체 삭제 실패:", error);
    }
  };

  // 검색 실행
  const performSearch = async (query) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    try {
      const response = await searchUsers(query.trim());
      // 백엔드 응답: { users: [...] }
      const users = response?.users || [];

      setSearchResults(users);

      // 각 사용자의 팔로우 상태 확인
      const statusPromises = users.map(async (u) => {
        if (u.id === user?.id)
          return { id: u.id, isFollowing: false, isMine: true };
        try {
          const status = await isFollowing(u.id);
          return { id: u.id, ...status };
        } catch (error) {
          console.error(`팔로우 상태 확인 실패 (${u.id}):`, error);
          return { id: u.id, isFollowing: false, isMine: false };
        }
      });

      const statuses = await Promise.all(statusPromises);
      const statusMap = {};
      statuses.forEach((status) => {
        statusMap[status.id] = status;
      });
      setFollowStatuses(statusMap);
    } catch (error) {
      console.error("검색 실패:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 검색어 입력 핸들러
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim().length === 0) {
      setShowResults(false);
      setSearchResults([]);
    } else {
      performSearch(value);
    }
  };

  // 검색 기록 클릭
  const handleHistoryClick = (historyItem) => {
    setSearchQuery(historyItem);
    performSearch(historyItem);
    saveToHistory(historyItem);
  };

  // Enter 키로 검색
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter" && searchQuery.trim().length > 0) {
      saveToHistory(searchQuery.trim());
      performSearch(searchQuery);
    }
  };

  // 팔로우/언팔로우 핸들러
  const handleFollowToggle = async (targetUser, e) => {
    e.stopPropagation();

    if (followLoading[targetUser.id] || followStatuses[targetUser.id]?.isMine)
      return;

    setFollowLoading((prev) => ({ ...prev, [targetUser.id]: true }));

    try {
      const currentStatus = followStatuses[targetUser.id];
      if (currentStatus?.isFollowing) {
        await unfollowUser(targetUser.id);
        setFollowStatuses((prev) => ({
          ...prev,
          [targetUser.id]: { ...currentStatus, isFollowing: false },
        }));
      } else {
        await followUser(targetUser.id);
        setFollowStatuses((prev) => ({
          ...prev,
          [targetUser.id]: { ...currentStatus, isFollowing: true },
        }));
      }
    } catch (error) {
      console.error("팔로우/언팔로우 실패:", error);
      alert("팔로우 처리에 실패했습니다.");
    } finally {
      setFollowLoading((prev) => ({ ...prev, [targetUser.id]: false }));
    }
  };

  // 프로필 이미지 URL 처리
  const getProfileImageUrl = (profileImage) => {
    if (!profileImage) return null;
    if (
      profileImage.startsWith("http://") ||
      profileImage.startsWith("https://")
    ) {
      return profileImage;
    }
    return `${baseURL}${profileImage}`;
  };

  // 사용자 클릭 (프로필 이동)
  const handleUserClick = (userId) => {
    navigate(`/normal/profile/${userId}`);
    setIsSearchOpen(false); // 검색 패널 닫기
  };

  const handleSearchToggle = () => {
    setIsSearchOpen(!isSearchOpen);
    setIsMoreOpen(false);
    // 검색 패널을 닫을 때 검색어 초기화
    if (isSearchOpen) {
      setSearchQuery("");
      setShowResults(false);
      setSearchResults([]);
    }
  };

  const handleMoreToggle = () => {
    setIsMoreOpen(!isMoreOpen);
    setIsSearchOpen(false);
  };

  const menuItems = [
    {
      icon: Home,
      label: "홈",
      path: "/normal/home",
      action: () => {
        setIsSearchOpen(false);
        setIsMoreOpen(false);
        navigate("/normal/home");
      },
    },
    { icon: Search, label: "검색", action: handleSearchToggle },
    {
      icon: Compass,
      label: "탐색 탭",
      path: "/normal/explore",
      action: () => {
        setIsSearchOpen(false);
        setIsMoreOpen(false);
        navigate("/normal/explore");
      },
    },
    {
      icon: Film,
      label: "릴스",
      path: "/normal/reels",
      action: () => {
        setIsSearchOpen(false);
        setIsMoreOpen(false);
        navigate("/normal/reels");
      },
    },
    {
      icon: PlusSquare,
      label: "만들기",
      path: "/normal/upload",
      action: () => {
        setIsSearchOpen(false);
        setIsMoreOpen(false);
        navigate("/normal/upload");
      },
    },
    {
      icon: User,
      label: "프로필",
      path: "/normal/profile",
      action: () => {
        setIsSearchOpen(false);
        setIsMoreOpen(false);
        navigate("/normal/profile");
      },
    },
  ];

  return (
    <>
      <Container $collapsed={isSearchOpen} $darkMode={isDarkMode}>
        <Logo
          onClick={() => navigate("/normal/home")}
          $collapsed={isSearchOpen}
        >
          <LogoImage
            src={isDarkMode ? "/unigen_white.png" : "/unigen_black.png"}
            alt="Unigen"
            $collapsed={isSearchOpen}
          />
        </Logo>

        <Nav>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.path
              ? location.pathname === item.path
              : isSearchOpen && item.icon === Search;

            return (
              <NavItem
                key={index}
                onClick={item.action}
                $active={isActive}
                $darkMode={isDarkMode}
              >
                <Icon
                  size={26}
                  strokeWidth={isActive ? 2.5 : 2}
                  fill={
                    isActive && item.icon === Home
                      ? isDarkMode
                        ? "#fff"
                        : "#262626"
                      : "none"
                  }
                  color={isDarkMode ? "#fff" : "#262626"}
                />
                <NavLabel
                  $active={isActive}
                  $collapsed={isSearchOpen}
                  $darkMode={isDarkMode}
                >
                  {item.label}
                </NavLabel>
              </NavItem>
            );
          })}
        </Nav>

        <MoreButton onClick={handleMoreToggle} $darkMode={isDarkMode}>
          <Menu size={26} color={isDarkMode ? "#fff" : "#262626"} />
          <NavLabel $collapsed={isSearchOpen} $darkMode={isDarkMode}>
            더보기
          </NavLabel>
        </MoreButton>
      </Container>

      {isSearchOpen && (
        <SearchPanel $darkMode={isDarkMode}>
          <SearchHeader>
            <SearchTitle $darkMode={isDarkMode}>검색</SearchTitle>
            <CloseButton onClick={handleSearchToggle} $darkMode={isDarkMode}>
              <X size={20} color={isDarkMode ? "#fff" : "#262626"} />
            </CloseButton>
          </SearchHeader>

          <SearchInput $darkMode={isDarkMode}>
            <input
              type="text"
              placeholder="검색"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
            />
          </SearchInput>

          <Divider $darkMode={isDarkMode} />

          {!showResults && (
            <RecentSection $darkMode={isDarkMode}>
              <RecentHeader>
                <RecentTitle $darkMode={isDarkMode}>최근 검색 항목</RecentTitle>
                {searchHistory.length > 0 && (
                  <ClearAllButton onClick={clearAllHistory}>
                    모두 지우기
                  </ClearAllButton>
                )}
              </RecentHeader>

              {searchHistory.length === 0 ? (
                <NoRecentSearches $darkMode={isDarkMode}>
                  최근 검색 항목이 없습니다.
                </NoRecentSearches>
              ) : (
                <HistoryList>
                  {searchHistory.map((item, index) => (
                    <HistoryItem
                      key={index}
                      onClick={() => handleHistoryClick(item)}
                      $darkMode={isDarkMode}
                    >
                      <HistoryText $darkMode={isDarkMode}>{item}</HistoryText>
                      <RemoveButton
                        onClick={(e) => removeFromHistory(item, e)}
                        $darkMode={isDarkMode}
                      >
                        <X size={16} />
                      </RemoveButton>
                    </HistoryItem>
                  ))}
                </HistoryList>
              )}
            </RecentSection>
          )}

          {showResults && (
            <ResultsSection $darkMode={isDarkMode}>
              {isSearching ? (
                <LoadingText $darkMode={isDarkMode}>검색 중...</LoadingText>
              ) : searchResults.length === 0 ? (
                <NoResults $darkMode={isDarkMode}>
                  검색 결과가 없습니다.
                </NoResults>
              ) : (
                <UserList>
                  {searchResults.map((resultUser) => {
                    const status = followStatuses[resultUser.id];
                    const isMine = status?.isMine || resultUser.id === user?.id;
                    const isFollowingUser = status?.isFollowing || false;
                    const isLoading = followLoading[resultUser.id] || false;

                    return (
                      <UserItem
                        key={resultUser.id}
                        onClick={() => handleUserClick(resultUser.id)}
                        $darkMode={isDarkMode}
                      >
                        <UserInfo>
                          <ProfileImageWrapper>
                            {getProfileImageUrl(resultUser.profile_image) ? (
                              <ProfileImage
                                src={getProfileImageUrl(
                                  resultUser.profile_image
                                )}
                                alt={resultUser.username}
                              />
                            ) : (
                              <DefaultAvatar $darkMode={isDarkMode}>
                                👤
                              </DefaultAvatar>
                            )}
                          </ProfileImageWrapper>
                          <UserDetails>
                            <Username $darkMode={isDarkMode}>
                              {resultUser.username}
                            </Username>
                            <Name $darkMode={isDarkMode}>
                              {resultUser.name}
                            </Name>
                            {resultUser.follower_count > 0 && (
                              <FollowerCount $darkMode={isDarkMode}>
                                팔로워{" "}
                                {resultUser.follower_count.toLocaleString()}명
                              </FollowerCount>
                            )}
                          </UserDetails>
                        </UserInfo>
                        {!isMine && (
                          <FollowButton
                            $isFollowing={isFollowingUser}
                            onClick={(e) => handleFollowToggle(resultUser, e)}
                            disabled={isLoading}
                            $darkMode={isDarkMode}
                          >
                            {isLoading
                              ? "처리 중..."
                              : isFollowingUser
                              ? "팔로잉"
                              : "팔로우"}
                          </FollowButton>
                        )}
                      </UserItem>
                    );
                  })}
                </UserList>
              )}
            </ResultsSection>
          )}
        </SearchPanel>
      )}

      {isMoreOpen && (
        <MorePanel $darkMode={isDarkMode}>
          <MoreContent>
            <MoreMenuItem
              onClick={() => navigate("/normal/settings")}
              $darkMode={isDarkMode}
            >
              <Settings size={24} color={isDarkMode ? "#fff" : "#262626"} />
              <MoreMenuLabel $darkMode={isDarkMode}>설정</MoreMenuLabel>
            </MoreMenuItem>

            <MoreMenuItem onClick={toggleDarkMode} $darkMode={isDarkMode}>
              {isDarkMode ? <Moon size={24} /> : <Sun size={24} />}
              <MoreMenuLabel $darkMode={isDarkMode}>모드 전환</MoreMenuLabel>
            </MoreMenuItem>

            <MoreMenuItem
              onClick={() => {
                if (confirm("로그아웃 하시겠습니까?")) {
                  // 카카오 로그인을 사용한 경우 카카오 로그아웃도 처리
                  if (user?.signup_mode === "kakao") {
                    logoutWithKakao();
                  }
                  logout();
                  navigate("/");
                }
              }}
              $darkMode={isDarkMode}
            >
              <MoreMenuLabel $darkMode={isDarkMode}>로그아웃</MoreMenuLabel>
            </MoreMenuItem>
          </MoreContent>
        </MorePanel>
      )}
    </>
  );
};

const Container = styled.aside`
  position: fixed;
  left: 0;
  top: 0;
  width: ${(props) => (props.$collapsed ? "72px" : "335px")};
  height: 100vh;
  background: ${(props) => (props.$darkMode ? "#000" : "white")};
  border-right: 1px solid
    ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  padding: 8px 12px 20px;
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: width 0.3s ease;

  @media (max-width: 1264px) {
    width: 72px;
  }

  @media (max-width: 767px) {
    display: none;
  }
`;

const Logo = styled.div`
  padding: ${(props) => (props.$collapsed ? "25px 0 16px" : "25px 12px 16px")};
  margin-bottom: 10px;
  cursor: pointer;
  display: flex;
  justify-content: ${(props) => (props.$collapsed ? "center" : "flex-start")};

  @media (max-width: 1264px) {
    padding: 25px 0 16px;
    justify-content: center;
  }
`;

const LogoImage = styled.img`
  height: ${(props) => (props.$collapsed ? "24px" : "29px")};
  transition: height 0.3s ease;

  @media (max-width: 1264px) {
    height: 24px;
  }
`;

const Nav = styled.nav`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const NavItem = styled.button`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: ${(props) => (props.$active ? "700" : "400")};
  background: ${(props) =>
    props.$active ? (props.$darkMode ? "#1a1a1a" : "#fafafa") : "transparent"};
  position: relative;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};

  &:hover {
    background: ${(props) => (props.$darkMode ? "#1a1a1a" : "#fafafa")};
  }

  &:active {
    transform: scale(0.95);
    background: ${(props) => (props.$darkMode ? "#262626" : "#efefef")};
  }

  svg {
    flex-shrink: 0;
  }

  @media (max-width: 1264px) {
    justify-content: center;
    padding: 12px;
  }
`;

const NavLabel = styled.span`
  font-size: 16px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  font-weight: ${(props) => (props.$active ? "700" : "400")};
  display: ${(props) => (props.$collapsed ? "none" : "inline")};

  @media (max-width: 1264px) {
    display: none;
  }
`;

const MoreButton = styled.button`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: auto;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};

  &:hover {
    background: ${(props) => (props.$darkMode ? "#1a1a1a" : "#fafafa")};
  }

  &:active {
    transform: scale(0.95);
    background: ${(props) => (props.$darkMode ? "#262626" : "#efefef")};
  }

  svg {
    flex-shrink: 0;
  }

  @media (max-width: 1264px) {
    justify-content: center;
  }
`;

const SearchPanel = styled.div`
  position: fixed;
  left: 72px;
  top: 0;
  width: 397px;
  height: 100vh;
  background: ${(props) => (props.$darkMode ? "#000" : "white")};
  border-right: 1px solid
    ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  z-index: 99;
  overflow-y: auto;
  animation: slideIn 0.3s ease;

  @keyframes slideIn {
    from {
      transform: translateX(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @media (max-width: 767px) {
    display: none;
  }
`;

const SearchHeader = styled.div`
  padding: 24px 24px 36px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SearchTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const CloseButton = styled.button`
  padding: 8px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  background: transparent;
  border: none;

  &:hover {
    background: ${(props) => (props.$darkMode ? "#1a1a1a" : "#fafafa")};
  }

  &:active {
    transform: scale(0.9);
    background: ${(props) => (props.$darkMode ? "#262626" : "#efefef")};
  }
`;

const SearchInput = styled.div`
  padding: 0 16px;
  margin-bottom: 24px;

  input {
    width: 100%;
    padding: 10px 16px;
    background: ${(props) => (props.$darkMode ? "#262626" : "#efefef")};
    border-radius: 8px;
    font-size: 14px;
    color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
    border: none;
    outline: none;

    &::placeholder {
      color: #8e8e8e;
    }

    &:focus {
      outline: none;
      background: ${(props) => (props.$darkMode ? "#1a1a1a" : "#e0e0e0")};
    }
  }
`;

const Divider = styled.div`
  height: 1px;
  background: ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  margin-bottom: 12px;
`;

const RecentSection = styled.div`
  padding: 0 24px;
`;

const RecentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const RecentTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const ClearAllButton = styled.button`
  font-size: 14px;
  color: #0095f6;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;
  border: none;
  padding: 0;

  &:hover {
    color: #00376b;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const NoRecentSearches = styled.div`
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
  font-weight: 600;
  color: #8e8e8e;
`;

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
`;

const HistoryItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  cursor: pointer;
  border-bottom: 1px solid
    ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};

  &:hover {
    background: ${(props) => (props.$darkMode ? "#1a1a1a" : "#fafafa")};
    margin: 0 -24px;
    padding: 12px 24px;
  }
`;

const HistoryText = styled.span`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const RemoveButton = styled.button`
  padding: 4px;
  cursor: pointer;
  background: transparent;
  border: none;
  color: #8e8e8e;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    opacity: 0.7;
  }
`;

const ResultsSection = styled.div`
  padding: 0 24px;
`;

const LoadingText = styled.div`
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
  color: #8e8e8e;
`;

const NoResults = styled.div`
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
  color: #8e8e8e;
`;

const UserList = styled.div`
  display: flex;
  flex-direction: column;
`;

const UserItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  cursor: pointer;
  border-bottom: 1px solid
    ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};

  &:hover {
    background: ${(props) => (props.$darkMode ? "#1a1a1a" : "#fafafa")};
    margin: 0 -24px;
    padding: 12px 24px;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`;

const ProfileImageWrapper = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
`;

const ProfileImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const DefaultAvatar = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) => (props.$darkMode ? "#262626" : "#efefef")};
  border: 1px solid ${(props) => (props.$darkMode ? "#404040" : "#dbdbdb")};
  border-radius: 50%;
  font-size: 28px;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Username = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const Name = styled.span`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
`;

const FollowerCount = styled.span`
  font-size: 12px;
  color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
`;

const FollowButton = styled.button`
  padding: 6px 16px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  background: ${(props) => (props.$isFollowing ? "transparent" : "#0095f6")};
  color: ${(props) =>
    props.$isFollowing ? (props.$darkMode ? "#fff" : "#262626") : "#fff"};
  border: ${(props) =>
    props.$isFollowing
      ? `1px solid ${props.$darkMode ? "#404040" : "#dbdbdb"}`
      : "none"};

  &:hover {
    background: ${(props) =>
      props.$isFollowing
        ? props.$darkMode
          ? "#262626"
          : "#efefef"
        : "#1877f2"};
    opacity: ${(props) => (props.$isFollowing ? 1 : 0.9)};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const MorePanel = styled.div`
  position: fixed;
  left: 12px;
  bottom: 90px;
  width: 266px;
  background: ${(props) => (props.$darkMode ? "#262626" : "white")};
  border: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 101;
  overflow: hidden;
  animation: slideUp 0.2s ease;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @media (max-width: 767px) {
    display: none;
  }
`;

const MoreHeader = styled.div`
  padding: 16px 16px 8px;
  border-bottom: 1px solid #dbdbdb;
`;

const MoreTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #262626;
`;

const MoreContent = styled.div`
  padding: 8px 0;
`;

const MoreMenuItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  background: transparent;
  border: none;

  &:hover {
    background: ${(props) => (props.$darkMode ? "#1a1a1a" : "#fafafa")};
  }

  &:active {
    background: ${(props) => (props.$darkMode ? "#000" : "#efefef")};
  }

  svg {
    flex-shrink: 0;
  }
`;

const MoreMenuLabel = styled.span`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const MoreDivider = styled.div`
  height: 1px;
  background: #dbdbdb;
  margin: 4px 0;
`;

export default LeftSidebar;
