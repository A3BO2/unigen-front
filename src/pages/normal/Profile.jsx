import { useState, useEffect, useRef, useCallback } from "react";
import styled, { keyframes, css } from "styled-components";
import { Settings, Moon, Sun, MoreHorizontal } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useNavigate, useParams } from "react-router-dom";
import LeftSidebar from "../../components/normal/LeftSidebar";
import RightSidebar from "../../components/normal/RightSidebar";
import BottomNav from "../../components/normal/BottomNav";
import { getCurrentUser, getUserProfileById, getFollowers, getFollowing, removeFollower, unfollowUser, isFollowing, followUser } from "../../services/user";
import { logoutWithKakao } from "../../utils/kakaoAuth";
import { getReel, getPostById, likePost, unlikePost, isPostLike, deletePost } from "../../services/post";
import { fetchComments, createComment, deleteComment } from "../../services/comment";
import { getTimeAgo } from "../../util/date";
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
  const { userId } = useParams(); // URL 파라미터에서 userId 가져오기
  const targetUserId = userId ? parseInt(userId, 10) : null; // 내 프로필인지 다른 사용자 프로필인지 구분
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
  const [showComments, setShowComments] = useState(null); // postId or null
  const [commentInput, setCommentInput] = useState("");
  const [isFollowListOpen, setIsFollowListOpen] = useState(false);
  const [followListType, setFollowListType] = useState(null); // "followers" or "following"
  const [followList, setFollowList] = useState([]);
  const [filteredFollowList, setFilteredFollowList] = useState([]);
  const [isLoadingFollowList, setIsLoadingFollowList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [comments, setComments] = useState([]);
  const [commentLoading, setCommentLoading] = useState(false);
  // 프로필 페이지용 팔로우 상태
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [isMine, setIsMine] = useState(false);
  const [followStatusLoading, setFollowStatusLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  // 댓글 모달용 팔로우 상태 (별도 관리)
  const [commentModalIsFollowing, setCommentModalIsFollowing] = useState(false);
  const [commentModalIsMine, setCommentModalIsMine] = useState(false);
  const [commentModalFollowLoading, setCommentModalFollowLoading] = useState(false);
  const [activateMenuPostId, setActivateMenuPostId] = useState(null);
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

      // URL 파라미터에 userId가 있으면 다른 사용자 프로필, 없으면 내 프로필
      const data = targetUserId 
        ? await getUserProfileById(targetUserId, pageNum, 9)
        : await getCurrentUser(pageNum, 9);

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
  }, [targetUserId]);

  // 내 프로필인지 확인
  const isMyProfile = !targetUserId || (profileData && user?.id === profileData.id);

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
        const data = targetUserId
          ? await getUserProfileById(targetUserId, currentPage, 9)
          : await getCurrentUser(currentPage, 9);

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
  }, [targetUserId]);

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

      const data = targetUserId
        ? await getUserProfileById(targetUserId, pageNum, 9)
        : await getCurrentUser(pageNum, 9);

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
  }, [targetUserId]);

  // 프로필 페이지에서 팔로우 상태 확인 (다른 사람 프로필일 때만)
  const followStatusCheckRef = useRef(false); // 중복 호출 방지용 ref
  
  useEffect(() => {
    const checkProfileFollowStatus = async () => {
      if (targetUserId && profileData && user?.id !== profileData.id) {
        // 이미 로딩 중이거나 체크 중이면 중복 호출 방지
        if (followStatusCheckRef.current || followStatusLoading) return;
        
        followStatusCheckRef.current = true;
        setFollowStatusLoading(true);
        try {
          const response = await isFollowing(targetUserId);
          // Boolean()으로 명시적 변환
          if (response && typeof response.isFollowing === "boolean") {
            setIsFollowingUser(response.isFollowing);
            setIsMine(Boolean(response.isMine));
          } else {
            setIsFollowingUser(false);
            setIsMine(false);
          }
        } catch (error) {
          console.error("팔로우 상태 확인 실패:", error);
          setIsFollowingUser(false);
          setIsMine(false);
        } finally {
          setFollowStatusLoading(false);
          followStatusCheckRef.current = false;
        }
      } else if (!targetUserId || (profileData && user?.id === profileData.id)) {
        setIsMine(true);
        setIsFollowingUser(false);
        setFollowStatusLoading(false);
        followStatusCheckRef.current = false;
      }
    };
    
    if (profileData) {
      checkProfileFollowStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId, profileData?.id, user?.id]);

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

  // 댓글 모달이 열릴 때 팔로우 상태 확인 (별도 상태 사용)
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (showComments) {
        const selectedPost = posts.find((p) => p.id === showComments);
        if (selectedPost && selectedPost.author_id) {
          setCommentModalFollowLoading(true);
          try {
            const response = await isFollowing(selectedPost.author_id);
            // Boolean()으로 명시적 변환
            setCommentModalIsFollowing(Boolean(response?.isFollowing));
            setCommentModalIsMine(Boolean(response?.isMine));
          } catch (error) {
            console.error("팔로우 상태 확인 실패:", error);
            setCommentModalIsFollowing(false);
            setCommentModalIsMine(false);
          } finally {
            setCommentModalFollowLoading(false);
          }
        }
      } else {
        // 모달이 닫힐 때 댓글 모달 상태만 초기화 (프로필 페이지 상태는 유지)
        setCommentModalFollowLoading(false);
        setCommentModalIsFollowing(false);
        setCommentModalIsMine(false);
      }
    };
    checkFollowStatus();
  }, [showComments, posts]);

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

  // 댓글 모달 열기 핸들러
  const handleShowComments = (postId) => {
    setShowComments(postId);
  };

  // 팔로우/언팔로우 핸들러 (댓글 모달용)
  const handleFollow = async () => {
    const selectedPost = posts.find((p) => p.id === showComments);
    if (!selectedPost || !selectedPost.author_id || commentModalFollowLoading) return;

    setCommentModalFollowLoading(true);
    try {
      if (commentModalIsFollowing) {
        await unfollowUser(selectedPost.author_id);
        setCommentModalIsFollowing(false);
      } else {
        await followUser(selectedPost.author_id);
        setCommentModalIsFollowing(true);
      }
    } catch (error) {
      console.error("팔로우/언팔로우 요청 실패:", error);
    } finally {
      setCommentModalFollowLoading(false);
    }
  };

  // 좋아요 핸들러
  const handleLike = async (postId) => {
    const target = posts.find((p) => p.id === postId);
    if (!target) return;

    // optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked: !p.liked,
              like_count: p.liked ? p.like_count - 1 : p.like_count + 1,
            }
          : p
      )
    );

    try {
      if (target.liked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    } catch (error) {
      console.error("좋아요 실패 → 롤백", error);
      // 실패 시 롤백
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                liked: target.liked,
                like_count: target.like_count,
              }
            : p
        )
      );
    }
  };

  // 메뉴 토글 함수
  const toggleMenu = (postId) => {
    if (activateMenuPostId === postId) {
      setActivateMenuPostId(null);
    } else {
      setActivateMenuPostId(postId);
    }
  };

  // 수정 핸들러
  const handleUpdate = async (post) => {
    navigate(`/feed/update/${post.id}`, {
      state: {
        content: post.content,
        imageUrl: post.image_url,
      },
    });
    setActivateMenuPostId(null);
  };

  // 삭제 핸들러
  const handleDelete = async (postId) => {
    if (!window.confirm("정말로 게시물을 삭제하시겠습니까?")) return;

    try {
      await deletePost(postId);
      alert("삭제되었습니다.");

      setPosts((prev) => prev.filter((post) => post.id !== postId));
      setActivateMenuPostId(null);

      // 모달 창이 열려있었다면 닫기
      if (showComments === postId) {
        setShowComments(null);
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "삭제 실패");
    }
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

  // 댓글 로드
  useEffect(() => {
    if (!showComments) return;

    const loadComments = async () => {
      setCommentLoading(true);
      try {
        const res = await fetchComments(showComments);
        setComments(res.comments);
      } catch (e) {
        console.error("댓글 불러오기 실패", e);
        setComments([]);
      } finally {
        setCommentLoading(false);
      }
    };

    loadComments();
  }, [showComments]);

  // 댓글 생성
  const handleCreateComment = async () => {
    if (!commentInput.trim()) return;

    try {
      await createComment(showComments, commentInput);

      // 다시 불러와서 서버 기준으로 동기화
      const res = await fetchComments(showComments);
      setComments(res.comments);

      // 댓글 수 증가
      setPosts((prev) =>
        prev.map((p) =>
          p.id === showComments ? { ...p, comment_count: p.comment_count + 1 } : p
        )
      );

      setCommentInput("");
    } catch (e) {
      console.error("댓글 작성 실패", e);
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("댓글을 삭제할까요?")) return;

    try {
      await deleteComment(commentId);

      const res = await fetchComments(showComments);
      setComments(res.comments);

      setPosts((prev) =>
        prev.map((p) =>
          p.id === showComments
            ? { ...p, comment_count: Math.max(0, p.comment_count - 1) }
            : p
        )
      );
    } catch (e) {
      console.error("댓글 삭제 실패", e);
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
                  {isMyProfile ? (
                    <>
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
                    </>
                  ) : (
                    <FollowButton
                      onClick={async () => {
                        if (!targetUserId || followLoading) return;
                        setFollowLoading(true);
                        try {
                          if (isFollowingUser) {
                            await unfollowUser(targetUserId);
                            setIsFollowingUser(false);
                          } else {
                            await followUser(targetUserId);
                            setIsFollowingUser(true);
                          }
                          // 프로필 데이터 새로고침 (팔로워 수 업데이트)
                          const data = await getUserProfileById(targetUserId, 1, 9);
                          if (data?.profile) {
                            setProfileData(data.profile);
                          }
                        } catch (error) {
                          console.error("팔로우/언팔로우 실패:", error);
                          alert("팔로우 처리에 실패했습니다.");
                        } finally {
                          setFollowLoading(false);
                        }
                      }}
                      $isFollowing={isFollowingUser}
                      disabled={followLoading || followStatusLoading}
                      $darkMode={isDarkMode}
                    >
                      {followLoading || followStatusLoading
                        ? "..."
                        : isFollowingUser
                        ? "팔로잉"
                        : "팔로우"}
                    </FollowButton>
                  )}
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
                    if (!isMyProfile) return; // 내 프로필일 때만 클릭 가능
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("팔로워 클릭됨");
                    handleFollowClick("followers");
                  }}
                  style={{ cursor: isMyProfile ? "pointer" : "default" }}
                >
                  <StatNumber $darkMode={isDarkMode}>
                    {profileData?.follower_count || 0}
                  </StatNumber>
                  <StatLabel $darkMode={isDarkMode}>팔로워</StatLabel>
                </Stat>
                <Stat 
                  onClick={(e) => {
                    if (!isMyProfile) return; // 내 프로필일 때만 클릭 가능
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("팔로우 클릭됨");
                    handleFollowClick("following");
                  }}
                  style={{ cursor: isMyProfile ? "pointer" : "default" }}
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
                      onClick={() => handleShowComments(post.id)}
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

          {/* 댓글 모달 부분 시작 */}
          {showComments && (
            <CommentsOverlay onClick={() => setShowComments(null)}>
              <CommentsModal onClick={(e) => e.stopPropagation()}>
                {/* 현재 보고 있는 포스트 찾기 */}
                {(() => {
                  const selectedPost = posts.find((p) => p.id === showComments);
                  if (!selectedPost) return null; // 삭제된 글이면 아무것도 안 보여줌

                  return (
                    <ModalContent>
                      {/* 왼쪽: 이미지 영역 */}
                      <ModalLeft>
                        <PostImageModal
                          src={getImageUrl(selectedPost.image_url)}
                          alt="post info"
                        />
                      </ModalLeft>

                      {/* 오른쪽: 헤더 + 댓글(본문) + 입력창 */}
                      <ModalRight $darkMode={isDarkMode}>
                        {/* 1. 모달 헤더 */}
                        <ModalHeader $darkMode={isDarkMode}>
                          <UserInfo>
                            <ModalUserAvatar>
                              {profileData?.profile_image ? (
                                <img src={getImageUrl(profileData.profile_image)} alt="" />
                              ) : (
                                "👤"
                              )}
                            </ModalUserAvatar>
                            <ModalUsernameText $darkMode={isDarkMode}>
                              {profileData?.name || "사용자"}
                            </ModalUsernameText>

                            {/* 팔로우 버튼 (내 글 아닐 때만) */}
                            {!commentModalIsMine && (
                              <FollowButton
                                onClick={handleFollow}
                                $isFollowing={commentModalIsFollowing}
                                disabled={commentModalFollowLoading}
                              >
                                {commentModalFollowLoading
                                  ? "..."
                                  : commentModalIsFollowing
                                  ? "팔로잉"
                                  : "팔로우"}
                              </FollowButton>
                            )}
                          </UserInfo>

                          {/* 내 글일 때만 수정/삭제 메뉴 표시 */}
                          {user?.id === profileData?.id && (
                            <div style={{ position: "relative" }}>
                              <MoreButton
                                $darkMode={isDarkMode}
                                onClick={() => toggleMenu(selectedPost.id)}
                              >
                                <MoreHorizontal size={24} />
                              </MoreButton>

                              {/* 드롭다운 메뉴 */}
                              {activateMenuPostId === selectedPost.id && (
                                <>
                                  <MenuOverlay
                                    onClick={() => setActivateMenuPostId(null)}
                                  />
                                  <DropdownMenu $darkMode={isDarkMode}>
                                    <MenuItem
                                      onClick={() => handleUpdate(selectedPost)}
                                      $darkMode={isDarkMode}
                                    >
                                      수정
                                    </MenuItem>
                                    <MenuItem
                                      onClick={() =>
                                        handleDelete(selectedPost.id)
                                      }
                                      $darkMode={isDarkMode}
                                      $danger
                                    >
                                      삭제
                                    </MenuItem>
                                  </DropdownMenu>
                                </>
                              )}
                            </div>
                          )}
                        </ModalHeader>

                        {/* 2. 댓글 목록 섹션 */}
                        <CommentsSection $darkMode={isDarkMode}>
                          {/* 게시물 본문(Caption)을 첫 번째 댓글처럼 표시 */}
                          <CommentItem>
                            <CommentAvatar>
                              {profileData?.profile_image ? (
                                <img src={getImageUrl(profileData.profile_image)} alt="" />
                              ) : (
                                "👤"
                              )}
                            </CommentAvatar>
                            <CommentContent>
                              <CommentUsername $darkMode={isDarkMode}>
                                {profileData?.name || "사용자"}
                              </CommentUsername>
                              <CommentText $darkMode={isDarkMode}>
                                {selectedPost.content || ""}
                              </CommentText>
                              <CommentTime $darkMode={isDarkMode}>
                                {selectedPost.created_at ? getTimeAgo(selectedPost.created_at) : ""}
                              </CommentTime>
                            </CommentContent>
                          </CommentItem>

                          {commentLoading ? (
                            <CommentText $darkMode={isDarkMode}>불러오는 중...</CommentText>
                          ) : comments.length === 0 ? (
                            <CommentText $darkMode={isDarkMode}>첫 댓글을 남겨보세요</CommentText>
                          ) : (
                            comments.map((c) => {
                              const isMineComment = user && c.user?.id === user.id;

                              return (
                                <CommentItem key={c.id}>
                                  <CommentAvatar>
                                    {c.user?.avatar ? (
                                      <img src={getImageUrl(c.user.avatar)} alt="" />
                                    ) : (
                                      "👤"
                                    )}
                                  </CommentAvatar>

                                  <CommentContent>
                                    <CommentUsername $darkMode={isDarkMode}>
                                      {c.user.name}
                                    </CommentUsername>
                                    <CommentText $darkMode={isDarkMode}>
                                      {c.text}
                                    </CommentText>
                                    {isMineComment && (
                                      <DeleteBtn
                                        onClick={() => handleDeleteComment(c.id)}
                                      >
                                        삭제
                                      </DeleteBtn>
                                    )}
                                    <CommentTime $darkMode={isDarkMode}>
                                      {getTimeAgo(c.createdAt)}
                                    </CommentTime>
                                  </CommentContent>
                                </CommentItem>
                              );
                            })
                          )}
                        </CommentsSection>

                        {/* 3. 하단 액션 버튼 (좋아요 등) */}
                        <ModalActions>
                          <ModalActionButtons>
                            <ActionButton
                              onClick={() => handleLike(showComments)}
                            >
                              <Heart
                                size={24}
                                fill={selectedPost.liked ? "#ed4956" : "none"}
                                color={
                                  selectedPost.liked
                                    ? "#ed4956"
                                    : isDarkMode
                                    ? "#fff"
                                    : "#262626"
                                }
                                strokeWidth={1.5}
                              />
                            </ActionButton>
                            <ActionButton>
                              <MessageCircle 
                                size={24} 
                                strokeWidth={1.5} 
                                color={isDarkMode ? "#fff" : "#262626"}
                              />
                            </ActionButton>
                          </ModalActionButtons>
                          <Likes $darkMode={isDarkMode}>
                            좋아요 {selectedPost.like_count?.toLocaleString() || 0}개
                          </Likes>
                          <Timestamp $darkMode={isDarkMode}>
                            {selectedPost.created_at ? getTimeAgo(selectedPost.created_at) : ""}
                          </Timestamp>
                        </ModalActions>

                        {/* 4. 댓글 입력창 */}
                        <CommentInputBox $darkMode={isDarkMode}>
                          <CommentInputIcon $darkMode={isDarkMode}>
                            <Heart 
                              size={20} 
                              fill="none" 
                              stroke={isDarkMode ? "#fff" : "#262626"} 
                              strokeWidth={1.5} 
                            />
                          </CommentInputIcon>
                          <input
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            placeholder="댓글 달기..."
                          />
                          <PostButton onClick={handleCreateComment}>
                            게시
                          </PostButton>
                        </CommentInputBox>
                      </ModalRight>
                    </ModalContent>
                  );
                })()}
              </CommentsModal>
            </CommentsOverlay>
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

// 모달 스타일 (Home.jsx 스타일)
const CommentsOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const CommentsModal = styled.div`
  background: white;
  border-radius: 4px;
  width: 90%;
  max-width: 1000px;
  height: 85vh;
  max-height: 800px;
  display: flex;
  overflow: hidden;

  @media (max-width: 767px) {
    width: 100%;
    height: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
`;

const ModalContent = styled.div`
  display: flex;
  width: 100%;
  height: 100%;

  @media (max-width: 767px) {
    flex-direction: column;
  }
`;

const ModalLeft = styled.div`
  flex: 1.3;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 767px) {
    flex: none;
    height: 50%;
  }
`;

const PostImageModal = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const ModalRight = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  border-left: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};

  @media (max-width: 767px) {
    border-left: none;
    border-top: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid
    ${(props) => (props.$darkMode ? "#363636" : "#efefef")};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
`;

const ModalUserAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: #fafafa;
  border: 1px solid #dbdbdb;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ModalUsernameText = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  transition: opacity 0.2s;
`;

const FollowButton = styled.button`
  padding: 7px 16px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  background: ${(props) => 
    props.$isFollowing 
      ? "transparent" 
      : "#0095f6"};
  color: ${(props) => 
    props.$isFollowing 
      ? (props.$darkMode ? "#fff" : "#262626")
      : "#fff"};
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
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const MoreButton = styled.button`
  padding: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
  outline: none;
  border: none;
  background: transparent;

  &:hover {
    opacity: 0.5;
  }

  svg {
    color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  }
`;

const MenuOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  cursor: default;
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background: ${(props) => (props.$darkMode ? "#262626" : "white")};
  border: 1px solid ${(props) => (props.$darkMode ? "#555" : "#dbdbdb")};
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 100px;
  z-index: 20;
  overflow: hidden;
`;

const MenuItem = styled.button`
  width: 100%;
  padding: 10px;
  text-align: center;
  font-size: 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  border-bottom: 1px solid ${(props) => (props.$darkMode ? "#333" : "#f0f0f0")};
  color: ${(props) =>
    props.$danger ? "#ed4956" : props.$darkMode ? "#fff" : "#262626"};
  font-weight: ${(props) => (props.$danger ? "700" : "400")};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${(props) => (props.$darkMode ? "#333" : "#fafafa")};
  }
`;

const CommentsSection = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
`;

const CommentItem = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
`;

const CommentAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: #fafafa;
  border: 1px solid #dbdbdb;
  flex-shrink: 0;
`;

const CommentContent = styled.div`
  flex: 1;
`;

const CommentUsername = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  margin-right: 8px;
`;

const CommentText = styled.span`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  line-height: 18px;
`;

const CommentTime = styled.div`
  font-size: 12px;
  color: ${(props) => (props.$darkMode ? "#a8a8a8" : "#8e8e8e")};
  margin-top: 8px;
`;

const DeleteBtn = styled.button`
  font-size: 12px;
  color: #ed4956;
  margin-left: 8px;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const ModalActions = styled.div`
  border-top: 1px solid #efefef;
  padding: 8px 16px;
`;

const ModalActionButtons = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
`;

const likeAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
`;

const ActionButton = styled.button`
  padding: 8px 8px 8px 0;
  cursor: pointer;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  outline: none;
  border: none;
  background: transparent;

  &:hover {
    opacity: 0.5;
  }

  &:active {
    transform: scale(0.9);
  }

  ${(props) =>
    props.$liked &&
    css`
      animation: ${likeAnimation} 0.4s ease;
    `}

  svg {
    color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  }
`;

const Likes = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  margin: 8px 0;
  cursor: pointer;

  &:hover {
    opacity: 0.5;
  }
`;

const Timestamp = styled.div`
  font-size: 10px;
  color: ${(props) => (props.$darkMode ? "#a8a8a8" : "#8e8e8e")};
  letter-spacing: 0.2px;
  margin-top: 8px;
  text-transform: uppercase;
`;

const CommentInputBox = styled.div`
  border-top: 0.5px solid ${(props) => (props.$darkMode ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)")};
  padding: 6px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};

  input {
    flex: 1;
    font-size: 14px;
    background: transparent;
    border: none;
    outline: none;
    color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};

    &::placeholder {
      color: ${(props) => (props.$darkMode ? "#a8a8a8" : "#8e8e8e")};
    }
  }
`;

const CommentInputIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const PostButton = styled.button`
  color: #0095f6;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #00376b;
  }

  &:active {
    opacity: 0.5;
  }
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
