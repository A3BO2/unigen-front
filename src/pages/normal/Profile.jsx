import { useState, useEffect, useRef, useCallback } from "react";
import styled from "styled-components";
import { Settings, Moon, Sun } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import LeftSidebar from "../../components/normal/LeftSidebar";
import RightSidebar from "../../components/normal/RightSidebar";
import BottomNav from "../../components/normal/BottomNav";
import { getCurrentUser, getFollowers, getFollowing, removeFollower, unfollowUser } from "../../services/user";
import { logoutWithKakao } from "../../utils/kakaoAuth";
import { getReel, getPostById } from "../../services/post";
import { X, Heart, MessageCircle, Send, Search } from "lucide-react";

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
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isFollowListOpen, setIsFollowListOpen] = useState(false);
  const [followListType, setFollowListType] = useState(null); // "followers" or "following"
  const [followList, setFollowList] = useState([]);
  const [filteredFollowList, setFilteredFollowList] = useState([]);
  const [isLoadingFollowList, setIsLoadingFollowList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [comments, setComments] = useState([]);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [likedComments, setLikedComments] = useState(new Set());
  const lastCommentRef = useRef(null);
  const commentObserverRef = useRef(null);
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

  // 댓글 무한스크롤 Intersection Observer 설정
  useEffect(() => {
    if (!isModalOpen || !hasMoreComments || isLoadingComments) {
      return;
    }

    if (commentObserverRef.current) {
      commentObserverRef.current.disconnect();
    }

    commentObserverRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMoreComments && !isLoadingComments) {
          loadMoreComments();
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      }
    );

    if (lastCommentRef.current) {
      commentObserverRef.current.observe(lastCommentRef.current);
    }

    return () => {
      if (commentObserverRef.current) {
        commentObserverRef.current.disconnect();
      }
    };
  }, [isModalOpen, hasMoreComments, isLoadingComments, comments.length]);

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

  // 게시물 클릭 핸들러
  const handlePostClick = async (postId) => {
    try {
      setSelectedPostId(postId);
      setIsModalOpen(true);
      setCommentPage(1);
      setHasMoreComments(true);
      const data = await getPostById(postId);
      setSelectedPost(data);
      // 초기 댓글 설정 (처음 10개만 표시)
      if (data.comments && data.comments.length > 0) {
        const initialComments = data.comments.slice(0, 10);
        setComments(initialComments);
        setHasMoreComments(data.comments.length > 10);
      } else {
        setComments([]);
        setHasMoreComments(false);
      }
    } catch (err) {
      console.error("게시물 로드 실패:", err);
      setError(err.message || "게시물을 불러오는데 실패했습니다.");
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
    setSelectedPostId(null);
    setCommentText("");
    setComments([]);
    setCommentPage(1);
    setHasMoreComments(true);
    setLikedComments(new Set());
  };

  // 팔로우/팔로워 목록 토글
  const handleFollowClick = async (type) => {
    console.log("팔로우/팔로워 클릭:", type);
    console.log("현재 상태:", { isFollowListOpen, followListType });
    
    // 같은 타입을 클릭하면 닫기
    if (isFollowListOpen && followListType === type) {
      console.log("목록 닫기");
      setIsFollowListOpen(false);
      setFollowListType(null);
      setFollowList([]);
      return;
    }
    
    // 다른 타입이거나 처음 열 때
    console.log("목록 열기:", type);
    setIsFollowListOpen(true);
    setFollowListType(type);
    setIsLoadingFollowList(true);
    setFollowList([]);
    
    try {
      let data;
      if (type === "followers") {
        console.log("팔로워 목록 가져오기");
        data = await getFollowers();
        console.log("팔로워 데이터:", data);
        const followers = data.followers || [];
        setFollowList(followers);
        setFilteredFollowList(followers);
      } else if (type === "following") {
        console.log("팔로우 목록 가져오기");
        data = await getFollowing();
        console.log("팔로우 데이터:", data);
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
    // body 스크롤 복원
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
        const username = (user.username || "").toLowerCase();
        const name = (user.name || "").toLowerCase();
        const query = searchQuery.toLowerCase();
        return username.includes(query) || name.includes(query);
      });
      setFilteredFollowList(filtered);
    }
  }, [searchQuery, followList]);

  // 팔로우/팔로워 삭제 핸들러
  const handleDeleteFollow = async (targetUserId) => {
    if (!confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    try {
      if (followListType === "followers") {
        // 팔로워 삭제 (나를 팔로우하는 사람 차단)
        await removeFollower(targetUserId);
      } else if (followListType === "following") {
        // 팔로우 삭제 (내가 팔로우하는 사람 언팔로우)
        await unfollowUser(targetUserId);
      }

      // 목록에서 제거
      const updatedList = followList.filter((user) => user.id !== targetUserId);
      setFollowList(updatedList);
      setFilteredFollowList(updatedList.filter((user) => {
        if (!searchQuery.trim()) return true;
        const username = (user.username || "").toLowerCase();
        const name = (user.name || "").toLowerCase();
        const query = searchQuery.toLowerCase();
        return username.includes(query) || name.includes(query);
      }));

      // 프로필 데이터 새로고침 (팔로워/팔로우 수 업데이트)
      const profileData = await getCurrentUser(1, 9);
      if (profileData?.profile) {
        setProfileData(profileData.profile);
      }
    } catch (err) {
      console.error("팔로우/팔로워 삭제 실패:", err);
      alert(err.message || "삭제에 실패했습니다.");
    }
  };

  // 댓글 하트 클릭 핸들러
  const handleCommentHeartClick = (commentId) => {
    const newLikedComments = new Set(likedComments);
    
    if (newLikedComments.has(commentId)) {
      newLikedComments.delete(commentId);
    } else {
      newLikedComments.add(commentId);
    }
    
    setLikedComments(newLikedComments);
  };

  // 댓글 더 로드
  const loadMoreComments = () => {
    if (!selectedPost || !hasMoreComments || isLoadingComments) return;
    
    setIsLoadingComments(true);
    const nextPage = commentPage + 1;
    const commentsPerPage = 10;
    const startIndex = commentPage * commentsPerPage;
    const endIndex = startIndex + commentsPerPage;
    
    if (selectedPost.comments && selectedPost.comments.length > startIndex) {
      const newComments = selectedPost.comments.slice(startIndex, endIndex);
      setComments((prev) => [...prev, ...newComments]);
      setCommentPage(nextPage);
      setHasMoreComments(selectedPost.comments.length > endIndex);
    } else {
      setHasMoreComments(false);
    }
    
    setIsLoadingComments(false);
  };

  // 댓글 제출
  const handleCommentSubmit = async () => {
    if (!commentText.trim() || !selectedPostId) return;
    
    try {
      // TODO: 댓글 작성 API 호출
      // 댓글 작성 후 게시물 다시 로드
      const data = await getPostById(selectedPostId);
      setSelectedPost(data);
      // 댓글 목록도 업데이트
      if (data.comments && data.comments.length > 0) {
        const initialComments = data.comments.slice(0, 10);
        setComments(initialComments);
        setHasMoreComments(data.comments.length > 10);
        setCommentPage(1);
      }
      setCommentText("");
    } catch (err) {
      console.error("댓글 작성 실패:", err);
    }
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
                <Stat 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("팔로워 클릭됨");
                    handleFollowClick("followers");
                  }}
                >
                  <StatNumber $darkMode={isDarkMode}>
                    {profileData?.follower_count || 0}
                  </StatNumber>
                  <StatLabel $darkMode={isDarkMode}>팔로워</StatLabel>
                </Stat>
                <Stat 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("팔로우 클릭됨");
                    handleFollowClick("following");
                  }}
                >
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

                {posts.map((post, index) => {
                  // 게시물 피드에서는 post_type이 'feed'인 것만 표시하고, video_url이 있어도 VideoIndicator를 표시하지 않음
                  if (post.post_type !== "feed") {
                    console.warn("게시물 피드에 잘못된 항목:", post);
                    return null;
                  }
                  
                  return (
                    <GridItem
                      key={post.id || index}
                      ref={index === posts.length - 1 ? lastPostRef : null}
                      onClick={() => handlePostClick(post.id)}
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
                      {/* 게시물 피드에서는 VideoIndicator를 절대 표시하지 않음 */}
                    </GridItem>
                  );
                })}
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

          {/* 게시물 모달 */}
          {isModalOpen && selectedPost && (
            <ModalOverlay onClick={handleCloseModal} $darkMode={isDarkMode}>
              <ModalContainer
                onClick={(e) => e.stopPropagation()}
                $darkMode={isDarkMode}
              >
                <CloseButton onClick={handleCloseModal} $darkMode={isDarkMode}>
                  <X size={24} />
                </CloseButton>

                <ModalContent>
                  {/* 왼쪽: 이미지 */}
                  <ModalImageSection>
                    {selectedPost.image_url ? (
                      <ModalImage
                        src={getImageUrl(selectedPost.image_url)}
                        alt="게시물 이미지"
                      />
                    ) : (
                      <NoImage $darkMode={isDarkMode}>이미지가 없습니다</NoImage>
                    )}
                  </ModalImageSection>

                  {/* 오른쪽: 댓글 */}
                  <ModalCommentSection $darkMode={isDarkMode}>
                    {/* 헤더 (fixed) */}
                    <ModalHeader $darkMode={isDarkMode}>
                      <ModalUserInfo>
                        {selectedPost.author?.profile_image ? (
                          <ModalAvatar
                            src={getImageUrl(selectedPost.author.profile_image)}
                            alt={selectedPost.author?.name || "사용자"}
                          />
                        ) : (
                          <ModalAvatarPlaceholder>👤</ModalAvatarPlaceholder>
                        )}
                        <ModalUsername $darkMode={isDarkMode}>
                          {selectedPost.author?.name || selectedPost.author?.username || "알 수 없음"}
                        </ModalUsername>
                      </ModalUserInfo>
                    </ModalHeader>

                    {/* 댓글 목록 (무한스크롤) */}
                    <CommentsContainer $darkMode={isDarkMode}>
                      <CommentsListWrapper>
                        {comments && comments.length > 0 ? (
                          <ul>
                            {comments.map((comment, index) => (
                              <CommentListItem
                                key={comment.id}
                                ref={index === comments.length - 1 ? lastCommentRef : null}
                                $darkMode={isDarkMode}
                              >
                                <CommentTextArea $darkMode={isDarkMode}>
                                  <CommentUsername $darkMode={isDarkMode}>
                                    {comment.author?.name || "알 수 없음"}
                                  </CommentUsername>
                                  <CommentText $darkMode={isDarkMode}>
                                    {comment.content}
                                  </CommentText>
                                </CommentTextArea>
                                <CommentHeart
                                  $darkMode={isDarkMode}
                                  $isLiked={likedComments.has(comment.id)}
                                  onClick={() => handleCommentHeartClick(comment.id)}
                                >
                                  <Heart
                                    size={12}
                                    strokeWidth={1.5}
                                    fill={likedComments.has(comment.id) ? "#ef4444" : "none"}
                                    color={likedComments.has(comment.id) ? "#ef4444" : undefined}
                                  />
                                </CommentHeart>
                              </CommentListItem>
                            ))}
                          </ul>
                        ) : (
                          <NoComments $darkMode={isDarkMode}>
                            댓글이 없습니다.
                          </NoComments>
                        )}
                        {isLoadingComments && (
                          <LoadingComments $darkMode={isDarkMode}>
                            댓글 불러오는 중...
                          </LoadingComments>
                        )}
                      </CommentsListWrapper>
                    </CommentsContainer>

                    {/* 댓글 입력란 (fixed) */}
                    <CommentInputWrapper $darkMode={isDarkMode}>
                      {user?.profile_image ? (
                        <CommentInputAvatar
                          src={getImageUrl(user.profile_image)}
                          alt="내 프로필"
                        />
                      ) : (
                        <CommentInputAvatarPlaceholder>👤</CommentInputAvatarPlaceholder>
                      )}
                      <CommentInput
                        type="text"
                        placeholder="댓글 달기..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleCommentSubmit();
                          }
                        }}
                        $darkMode={isDarkMode}
                      />
                      <CommentSubmitButton
                        onClick={handleCommentSubmit}
                        $darkMode={isDarkMode}
                      >
                        게시
                      </CommentSubmitButton>
                    </CommentInputWrapper>
                  </ModalCommentSection>
                </ModalContent>
              </ModalContainer>
            </ModalOverlay>
          )}

          {/* 팔로우/팔로워 모달 */}
          {isFollowListOpen && (
            <FollowModalOverlay onClick={handleCloseFollowModal} $darkMode={isDarkMode}>
              <FollowModalContainer
                onClick={(e) => e.stopPropagation()}
                $darkMode={isDarkMode}
              >
                <FollowModalHeader $darkMode={isDarkMode}>
                  <FollowModalTitle $darkMode={isDarkMode}>
                    {followListType === "followers" ? "팔로워" : "팔로우"}
                  </FollowModalTitle>
                  <FollowModalCloseButton onClick={handleCloseFollowModal} $darkMode={isDarkMode}>
                    <X size={20} />
                  </FollowModalCloseButton>
                </FollowModalHeader>

                <FollowSearchBar $darkMode={isDarkMode}>
                  <Search size={16} />
                  <FollowSearchInput
                    type="text"
                    placeholder="검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    $darkMode={isDarkMode}
                  />
                </FollowSearchBar>

                <FollowListContent $darkMode={isDarkMode}>
                  {isLoadingFollowList ? (
                    <LoadingContainer $darkMode={isDarkMode}>
                      <Spinner />
                      <LoadingMessage $darkMode={isDarkMode}>
                        불러오는 중...
                      </LoadingMessage>
                    </LoadingContainer>
                  ) : filteredFollowList.length > 0 ? (
                    <FollowList>
                      {filteredFollowList.map((user) => (
                        <FollowListItem key={user.id} $darkMode={isDarkMode}>
                          <FollowUserAvatar>
                            {user.profile_image ? (
                              <img
                                src={getImageUrl(user.profile_image)}
                                alt={user.name || user.username}
                              />
                            ) : (
                              <AvatarPlaceholder>👤</AvatarPlaceholder>
                            )}
                          </FollowUserAvatar>
                          <FollowUserInfo>
                            <FollowUsername $darkMode={isDarkMode}>
                              {user.username || "알 수 없음"}
                            </FollowUsername>
                            {user.name && (
                              <FollowName $darkMode={isDarkMode}>
                                {user.name}
                              </FollowName>
                            )}
                          </FollowUserInfo>
                          <FollowDeleteButton 
                            $darkMode={isDarkMode}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFollow(user.id);
                            }}
                          >
                            삭제
                          </FollowDeleteButton>
                        </FollowListItem>
                      ))}
                    </FollowList>
                  ) : (
                    <EmptyFollowList $darkMode={isDarkMode}>
                      {searchQuery ? "검색 결과가 없습니다." : (followListType === "followers" ? "팔로워가 없습니다." : "팔로우한 사용자가 없습니다.")}
                    </EmptyFollowList>
                  )}
                </FollowListContent>
              </FollowModalContainer>
            </FollowModalOverlay>
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
  cursor: pointer;
  user-select: none;

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

// 모달 스타일
const ModalOverlay = styled.div`
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

const ModalContainer = styled.div`
  width: 838.4px;
  height: 576.05px;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  border-radius: 8px;
  position: relative;
  display: flex;
  overflow: hidden;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  z-index: 10;
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.7);
  }
`;

const ModalContent = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
`;

const ModalImageSection = styled.div`
  width: 50%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  overflow: hidden;
`;

const ModalImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const ModalCommentSection = styled.div`
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  border-left: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
`;

const ModalHeader = styled.div`
  position: sticky;
  top: 0;
  padding: 16px;
  border-bottom: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  z-index: 10;
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

const CommentsContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  min-height: 0;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
    border-radius: 4px;
  }
`;

const CommentsListWrapper = styled.div`
  padding: 16px;
  
  ul {
    list-style: none;
    padding: 16px;
    margin: 0;
    width: 100%;
    height: 313.85px;
    box-sizing: border-box;
    overflow-y: auto;
  }
`;

const CommentListItem = styled.li`
  width: 100%;
  height: 43px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
  box-sizing: border-box;
`;

const CommentTextArea = styled.div`
  flex: 1;
  height: 43px;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const CommentUsername = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  flex-shrink: 0;
`;

const CommentText = styled.span`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CommentHeart = styled.button`
  width: 12px;
  height: 12px;
  background: transparent;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${(props) => (props.$isLiked ? "#ef4444" : props.$darkMode ? "#fff" : "#262626")};
  flex-shrink: 0;
  transition: transform 0.2s ease;
  
  &:hover {
    opacity: 0.7;
  }
  
  &:active {
    transform: scale(1.2);
  }
  
  svg {
    transition: fill 0.3s ease, color 0.3s ease, transform 0.3s ease;
    animation: ${(props) => (props.$isLiked ? "heartBeat 0.4s ease" : "none")};
  }
  
  @keyframes heartBeat {
    0% {
      transform: scale(1);
    }
    25% {
      transform: scale(1.4);
    }
    50% {
      transform: scale(1.2);
    }
    75% {
      transform: scale(1.3);
    }
    100% {
      transform: scale(1);
    }
  }
`;

const NoComments = styled.div`
  text-align: center;
  padding: 32px 0;
  color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  font-size: 14px;
`;

const CommentInputWrapper = styled.div`
  position: sticky;
  bottom: 0;
  padding: 12px 16px;
  border-top: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 10;
  flex-shrink: 0;
`;

const CommentInputAvatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`;

const CommentInputAvatarPlaceholder = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
`;

const CommentInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  font-size: 14px;
  padding: 8px 0;

  &::placeholder {
    color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  }

  &:focus {
    outline: none;
  }
`;

const CommentSubmitButton = styled.button`
  background: transparent;
  border: none;
  color: ${(props) => (props.$darkMode ? "#0095f6" : "#0095f6")};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 0;

  &:hover {
    opacity: 0.7;
  }
`;

const LoadingComments = styled.div`
  text-align: center;
  padding: 16px;
  color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  font-size: 14px;
`;

const NoImage = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  font-size: 16px;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
`;

const AvatarPlaceholder = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
`;

// 모달용 작은 Avatar와 UserInfo
const ModalUserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ModalAvatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`;

const ModalAvatarPlaceholder = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
`;

const ModalUsername = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

// 팔로우/팔로워 모달 스타일
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
  width: 400px;
  max-width: 90vw;
  max-height: 80vh;
  background: ${(props) => (props.$darkMode ? "#262626" : "#fff")};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const FollowModalHeader = styled.div`
  padding: 20px 20px;
  min-height: 60px;
  border-bottom: 1px solid ${(props) => (props.$darkMode ? "#363636" : "#dbdbdb")};
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  flex-shrink: 0;
`;

const FollowModalCloseButton = styled.button`
  position: absolute;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  z-index: 10;
  transition: background 0.2s;
  padding: 0;
  
  &:hover {
    background: ${(props) => (props.$darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)")};
  }
`;

const FollowModalTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  margin: 0;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
`;

const FollowSearchBar = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid ${(props) => (props.$darkMode ? "#363636" : "#dbdbdb")};
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${(props) => (props.$darkMode ? "#1a1a1a" : "#fafafa")};
  flex-shrink: 0;
  
  svg {
    color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
    flex-shrink: 0;
  }
`;

const FollowSearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  font-size: 14px;
  padding: 4px 0;
  
  &::placeholder {
    color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  }
  
  &:focus {
    outline: none;
  }
`;

const FollowListContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  background: ${(props) => (props.$darkMode ? "#262626" : "#fff")};
  min-height: 0;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${(props) => (props.$darkMode ? "#262626" : "#fff")};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${(props) => (props.$darkMode ? "#363636" : "#dbdbdb")};
    border-radius: 4px;
  }
`;

const FollowList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  width: 100%;
  display: block;
`;

const FollowListItem = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 0.2s;
  width: 100%;
  box-sizing: border-box;
  
  &:hover {
    background: ${(props) => (props.$darkMode ? "#363636" : "#fafafa")};
  }
`;

const FollowDeleteButton = styled.button`
  background: ${(props) => (props.$darkMode ? "#363636" : "#f0f0f0")};
  border: none;
  border-radius: 4px;
  padding: 6px 16px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-left: auto;
  flex-shrink: 0;
  transition: background 0.2s;
  
  &:hover {
    background: ${(props) => (props.$darkMode ? "#4a4a4a" : "#e0e0e0")};
  }
`;

const FollowUserAvatar = styled.div`
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  
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
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  display: block;
  line-height: 1.4;
`;

const FollowName = styled.span`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  display: block;
  line-height: 1.4;
`;

const EmptyFollowList = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  font-size: 14px;
`;

export default Profile;
