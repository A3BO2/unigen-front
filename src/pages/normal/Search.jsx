import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Search as SearchIcon, X } from "lucide-react";
import BottomNav from "../../components/normal/BottomNav";
import LeftSidebar from "../../components/normal/LeftSidebar";
import { useApp } from "../../context/AppContext";
import {
  searchUsers,
  followUser,
  unfollowUser,
  isFollowing,
} from "../../services/user";

const STORAGE_KEY = "searchHistory";

const Search = () => {
  const navigate = useNavigate();
  const { user, isDarkMode } = useApp();
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
      const users = response.users || [];

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
      // 디바운스 없이 바로 검색
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
    // 현재는 내 프로필 페이지만 지원하므로 내 프로필로 이동
    navigate("/normal/profile");
  };

  return (
    <Container $darkMode={isDarkMode}>
      <LeftSidebar />
      <MainContent $darkMode={isDarkMode}>
        <Header>
          <SearchBar $darkMode={isDarkMode}>
            <SearchIcon size={16} color={isDarkMode ? "#8e8e8e" : "#8e8e8e"} />
            <Input
              $darkMode={isDarkMode}
              placeholder="검색"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
            />
            {searchQuery && (
              <ClearButton
                onClick={() => {
                  setSearchQuery("");
                  setShowResults(false);
                  setSearchResults([]);
                }}
                $darkMode={isDarkMode}
              >
                <X size={16} />
              </ClearButton>
            )}
          </SearchBar>
        </Header>

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
                              src={getProfileImageUrl(resultUser.profile_image)}
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
                          <Name $darkMode={isDarkMode}>{resultUser.name}</Name>
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

        <BottomNav />
      </MainContent>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${(props) => (props.$darkMode ? "#000" : "#fafafa")};
`;

const MainContent = styled.div`
  flex: 1;
  margin-left: 335px;
  padding-bottom: 60px;
  background: ${(props) => (props.$darkMode ? "#000" : "#fafafa")};
  max-width: calc(100vw - 335px);

  @media (max-width: 1264px) {
    margin-left: 72px;
    max-width: calc(100vw - 72px);
  }

  @media (max-width: 767px) {
    margin-left: 0;
    max-width: 100vw;
  }
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  background: ${(props) => (props.$darkMode ? "#000" : "white")};
  border-bottom: 1px solid
    ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  padding: 16px 24px;
  z-index: 10;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${(props) => (props.$darkMode ? "#262626" : "#efefef")};
  border-radius: 8px;
  max-width: 400px;
`;

const Input = styled.input`
  flex: 1;
  font-size: 14px;
  background: transparent;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  border: none;
  outline: none;

  &::placeholder {
    color: #8e8e8e;
  }
`;

const ClearButton = styled.button`
  padding: 4px;
  cursor: pointer;
  background: transparent;
  border: none;
  color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    opacity: 0.7;
  }
`;

const RecentSection = styled.div`
  padding: 24px;
`;

const RecentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
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
  background: transparent;
  border: none;
  padding: 0;

  &:hover {
    color: #00376b;
  }

  @media (prefers-color-scheme: dark) {
    color: #4db5f9;
    &:hover {
      color: #0095f6;
    }
  }
`;

const NoRecentSearches = styled.div`
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
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
  padding: 24px;
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
  background: ${(props) =>
    props.$isFollowing
      ? props.$darkMode
        ? "#262626"
        : "transparent"
      : "#0095f6"};
  color: ${(props) => (props.$isFollowing ? "#262626" : "#fff")};
  border: ${(props) =>
    props.$isFollowing
      ? `1px solid ${props.$darkMode ? "#404040" : "#dbdbdb"}`
      : "none"};

  &:hover {
    background: ${(props) =>
      props.$isFollowing
        ? props.$darkMode
          ? "#404040"
          : "#efefef"
        : "#1877f2"};
    opacity: ${(props) => (props.$isFollowing ? 1 : 0.9)};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (prefers-color-scheme: dark) {
    color: ${(props) => (props.$isFollowing ? "#fff" : "#fff")};
  }
`;

export default Search;
