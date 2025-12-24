import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import {
  Heart,
  MessageCircle,
  Send,
  MoreHorizontal,
  Plus,
  Loader2,
} from "lucide-react";
import LeftSidebar from "../../components/normal/LeftSidebar";
import RightSidebar from "../../components/normal/RightSidebar";
import BottomNav from "../../components/normal/BottomNav";
import { useApp } from "../../context/AppContext";
import { getPosts, getStories } from "../../services/post";
import { isFollowing, followUser, unfollowUser } from "../../services/user";
import { isMyStory, getStoryViewers, watchStory } from "../../services/story";
import { getTimeAgo } from "../../util/date";
import { deletePost } from "../../services/post";

const Home = () => {
  const navigate = useNavigate();
  const { user, isDarkMode } = useApp();
  const [posts, setPosts] = useState([]);
  const [showComments, setShowComments] = useState(null);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [isMine, setIsMine] = useState(false);
  const [followStatusLoading, setFollowStatusLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);
  const loadedPagesRef = useRef(new Set()); // 이미 로드된 페이지 추적

  const [activateMenuPostId, setActivateMenuPostId] = useState(null); // 현재 열린 메뉴의 포스트 ID(null이면 닫힘)

  // 스토리 관련 state
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [currentStoryItemIndex, setCurrentStoryItemIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const storyTimerRef = useRef(null);
  const progressCompleteRef = useRef(false);
  const storiesRef = useRef([]);

  const POSTS_PER_PAGE = 5; // 한 번에 불러올 포스트 개수

  // 스토리 데이터
  const [stories, setStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);

  // 내 스토리 관련 state
  const [isCurrentStoryMine, setIsCurrentStoryMine] = useState(false);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [storyViewers, setStoryViewers] = useState([]);
  const [viewersLoading, setViewersLoading] = useState(false);

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
        content: post.caption,
        imageUrl: post.image,
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

  // 스토리 데이터 로드
  useEffect(() => {
    const loadStories = async () => {
      setStoriesLoading(true);
      try {
        const data = await getStories();
        console.log("스토리 API 응답:", data);

        // API 데이터 검증
        if (!data || !data.stories || !Array.isArray(data.stories)) {
          console.warn("스토리 데이터 형식이 올바르지 않습니다:", data);
          setStories([]);
          return;
        }

        // API 데이터를 stories 형식으로 변환
        const toAbsolute = (url) => {
          if (!url) return null;
          return url.startsWith("http") ? url : `${url}`;
        };

        const transformedStories = data.stories
          .filter((story) => story && story.items && story.items.length > 0)
          .map((story) => ({
            id: story.userId,
            user: {
              name: story.author?.name || "알 수 없음",
              avatar: toAbsolute(story.author?.profileImageUrl),
            },
            items: story.items.map((item) => ({
              id: item.id,
              type: "image",
              url: toAbsolute(item.imageUrl),
              createdAt: item.createdAt, // 원본 데이터 유지
              timestamp: getTimeAgo(item.createdAt),
            })),
          }));

        console.log("변환된 스토리:", transformedStories);
        setStories(transformedStories);
        storiesRef.current = transformedStories;
      } catch (error) {
        console.error("스토리 로딩 실패:", error);
        setStories([]);
      } finally {
        setStoriesLoading(false);
      }
    };

    loadStories();
  }, []);

  // 포스트 데이터 불러오기
  const loadPosts = useCallback(
    async (pageNum) => {
      // 이미 로드 중이거나, 더 이상 데이터가 없거나, 이미 로드된 페이지면 스킵
      if (loading || !hasMore || loadedPagesRef.current.has(pageNum)) return;

      loadedPagesRef.current.add(pageNum); // 페이지 로딩 시작 표시
      setLoading(true);

      try {
        const data = await getPosts("normal", pageNum, POSTS_PER_PAGE);

        // [수정 1] 데이터가 제대로 왔는지 확인 (방어 코드)
        if (!data || !data.items) {
          console.warn(
            "데이터가 비어있거나 형식이 올바르지 않습니다. 로딩을 중단합니다."
          );
          setHasMore(false); // 더 이상 요청하지 않음
          return;
        }

        console.log(`페이지 ${pageNum} 로드:`, data.items[0]);

        // [수정 포인트 1] URL 변환 헬퍼 함수 추가 (스토리 로직과 동일하게)
        const toAbsolute = (url) => {
          if (!url) return null;
          return url.startsWith("http") ? url : `${baseURL}${url}`;
        };

        // API 데이터를 posts 형식으로 변환
        const transformedPosts = data.items.map((item) => ({
          id: item.id,
          user: {
            id: item.author.id || item.authorId,
            name: item.author.name,
            avatar: toAbsolute(item.author.profileImageUrl),
          },
          image: toAbsolute(`${item.imageUrl}`),
          likes: item.likeCount,
          caption: item.content,
          timestamp: getTimeAgo(item.createdAt),
          liked: false,
          comments: item.commentCount,
        }));

        // 중복 제거: 기존 포스트 ID와 비교하여 새로운 포스트만 추가
        setPosts((prevPosts) => {
          const existingIds = new Set(prevPosts.map((p) => p.id));
          const newPosts = transformedPosts.filter(
            (post) => !existingIds.has(post.id)
          );
          return [...prevPosts, ...newPosts];
        });

        // [수정 2] 가져온 개수가 요청한 개수보다 적으면 마지막 페이지로 간주
        if (data.items.length < POSTS_PER_PAGE) {
          setHasMore(false);
        } else {
          setHasMore(data.hasNext); // 백엔드에서 hasNext를 준다면 사용
        }

        setHasMore(data.items.length === POSTS_PER_PAGE);
      } catch (error) {
        console.error("포스트 로딩 실패:", error);
        // [수정 3] 에러가 나면 무한 스크롤 멈춤 (안 그러면 계속 71, 72 페이지 요청함)
        setHasMore(false);
        loadedPagesRef.current.delete(pageNum); // 실패시 재시도 가능하도록
      } finally {
        setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [loading, hasMore]
  );

  // 초기 로딩
  useEffect(() => {
    loadPosts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 빈 배열로 한 번만 실행

  // Intersection Observer로 무한 스크롤 구현
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((prevPage) => {
            const nextPage = prevPage + 1;
            loadPosts(nextPage);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadPosts]);

  // 댓글 모달이 열릴 때 팔로우 상태 확인
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (showComments) {
        const selectedPost = posts.find((p) => p.id === showComments);
        if (selectedPost && selectedPost.user.id) {
          setFollowStatusLoading(true);
          try {
            const response = await isFollowing(selectedPost.user.id);
            setIsFollowingUser(response.isFollowing);
            setIsMine(response.isMine);
          } catch (error) {
            console.error("팔로우 상태 확인 실패:", error);
            setIsFollowingUser(false);
            setIsMine(false);
          } finally {
            setFollowStatusLoading(false);
          }
        }
      } else {
        // 모달이 닫힐 때 상태 초기화
        setFollowStatusLoading(false);
        setIsFollowingUser(false);
        setIsMine(false);
      }
    };
    checkFollowStatus();
  }, [showComments, posts]);

  // 댓글 모달 열기 핸들러
  const handleShowComments = (postId) => {
    setFollowStatusLoading(true);
    setShowComments(postId);
  };

  // 팔로우/언팔로우 핸들러
  const handleFollow = async () => {
    const selectedPost = posts.find((p) => p.id === showComments);
    if (!selectedPost || !selectedPost.user.id || followLoading) return;

    setFollowLoading(true);
    try {
      if (isFollowingUser) {
        await unfollowUser(selectedPost.user.id);
        setIsFollowingUser(false);
      } else {
        await followUser(selectedPost.user.id);
        setIsFollowingUser(true);
      }
    } catch (error) {
      console.error("팔로우/언팔로우 요청 실패:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleLike = (postId) => {
    setPosts(
      posts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            liked: !post.liked,
            likes: post.liked ? post.likes - 1 : post.likes + 1,
          };
        }
        return post;
      })
    );
  };

  // 스토리 관련 함수
  const openStoryViewer = useCallback(async (storyIndex) => {
    setCurrentStoryIndex(storyIndex);
    setCurrentStoryItemIndex(0);
    setStoryProgress(0);
    setIsImageLoaded(false);
    progressCompleteRef.current = false;
    setShowStoryViewer(true);
    setIsCurrentStoryMine(false);

    // 현재 스토리의 첫 번째 아이템 ID로 API 호출
    const currentStory = storiesRef.current[storyIndex];
    if (currentStory && currentStory.items && currentStory.items[0]) {
      const storyItemId = currentStory.items[0].id;

      // 내 스토리인지 확인
      try {
        const isMineResponse = await isMyStory(storyItemId);
        setIsCurrentStoryMine(isMineResponse.isMine);
      } catch (error) {
        console.error("내 스토리 확인 실패:", error);
        setIsCurrentStoryMine(false);
      }

      // 스토리 조회 기록
      try {
        await watchStory(storyItemId);
      } catch (error) {
        console.error("스토리 조회 기록 실패:", error);
      }
    }
  }, []);

  const closeStoryViewer = useCallback(() => {
    setShowStoryViewer(false);
    setCurrentStoryIndex(0);
    setCurrentStoryItemIndex(0);
    setStoryProgress(0);
    setIsImageLoaded(false);
    progressCompleteRef.current = false;
    setIsCurrentStoryMine(false);
    setShowViewersModal(false);
    setStoryViewers([]);
    if (storyTimerRef.current) {
      clearInterval(storyTimerRef.current);
    }
  }, []);

  const goToNextStoryItem = useCallback(() => {
    const currentStory = stories[currentStoryIndex];
    if (!currentStory) return;

    // 중복 호출 방지
    progressCompleteRef.current = false;

    if (currentStoryItemIndex < currentStory.items.length - 1) {
      setCurrentStoryItemIndex((prev) => prev + 1);
      setStoryProgress(0);
      setIsImageLoaded(false);
    } else {
      // 다음 스토리로
      if (currentStoryIndex < stories.length - 1) {
        setCurrentStoryIndex((prev) => prev + 1);
        setCurrentStoryItemIndex(0);
        setStoryProgress(0);
        setIsImageLoaded(false);
      } else {
        closeStoryViewer();
      }
    }
  }, [currentStoryIndex, currentStoryItemIndex, stories, closeStoryViewer]);

  const goToPrevStoryItem = useCallback(() => {
    // 중복 호출 방지
    progressCompleteRef.current = false;

    if (currentStoryItemIndex > 0) {
      setCurrentStoryItemIndex((prev) => prev - 1);
      setStoryProgress(0);
      setIsImageLoaded(false);
    } else {
      // 이전 스토리로
      if (currentStoryIndex > 0) {
        const prevStory = stories[currentStoryIndex - 1];
        if (prevStory) {
          setCurrentStoryIndex((prev) => prev - 1);
          setCurrentStoryItemIndex(prevStory.items.length - 1);
          setStoryProgress(0);
          setIsImageLoaded(false);
        }
      }
    }
  }, [currentStoryIndex, currentStoryItemIndex, stories]);

  // 스토리 아이템이 변경될 때 watchStory 호출
  useEffect(() => {
    if (!showStoryViewer) return;

    const currentStory = storiesRef.current[currentStoryIndex];
    if (
      currentStory &&
      currentStory.items &&
      currentStory.items[currentStoryItemIndex]
    ) {
      const storyItemId = currentStory.items[currentStoryItemIndex].id;

      // 스토리 조회 기록
      watchStory(storyItemId).catch((error) => {
        console.error("스토리 조회 기록 실패:", error);
      });
    }
  }, [showStoryViewer, currentStoryIndex, currentStoryItemIndex]);

  // 활동(조회자 목록) 모달 열기
  const openViewersModal = async () => {
    const currentStory = stories[currentStoryIndex];
    if (
      !currentStory ||
      !currentStory.items ||
      !currentStory.items[currentStoryItemIndex]
    )
      return;

    const storyItemId = currentStory.items[currentStoryItemIndex].id;
    setViewersLoading(true);
    setShowViewersModal(true);

    try {
      const response = await getStoryViewers(storyItemId);
      if (response.success) {
        setStoryViewers(response.viewers || []);
      } else {
        setStoryViewers([]);
      }
    } catch (error) {
      console.error("조회자 목록 조회 실패:", error);
      setStoryViewers([]);
    } finally {
      setViewersLoading(false);
    }
  };

  // 조회자 모달 닫기
  const closeViewersModal = () => {
    setShowViewersModal(false);
    setStoryViewers([]);
  };

  // 스토리 자동 진행
  useEffect(() => {
    if (!showStoryViewer || !isImageLoaded || showViewersModal) return;

    const currentStory = storiesRef.current[currentStoryIndex];
    if (!currentStory || !currentStory.items) return;

    const isLastStoryItem =
      currentStoryIndex === storiesRef.current.length - 1 &&
      currentStoryItemIndex === currentStory.items.length - 1;

    // 새로운 스토리 아이템으로 넘어올 때 progressCompleteRef 초기화
    progressCompleteRef.current = false;

    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        const newProgress = prev + 2; // 5초 동안 진행 (100 / 50 frames)

        if (newProgress >= 100) {
          // 마지막 스토리의 마지막 아이템이면 스토리 뷰어 닫기
          if (isLastStoryItem) {
            clearInterval(interval);
            // 약간의 딜레이 후 닫기 (마지막 스토리를 완전히 보여주기 위해)
            setTimeout(() => {
              closeStoryViewer();
            }, 300);
            return 100;
          }

          // 중복 호출 방지
          if (!progressCompleteRef.current) {
            progressCompleteRef.current = true;
            clearInterval(interval);

            // 다음 스토리 아이템으로 이동 로직
            setCurrentStoryIndex((prevIndex) => {
              setCurrentStoryItemIndex((prevItemIndex) => {
                const story = storiesRef.current[prevIndex];
                if (!story) return prevItemIndex;

                // 현재 스토리에 다음 아이템이 있으면
                if (prevItemIndex < story.items.length - 1) {
                  setStoryProgress(0);
                  setIsImageLoaded(false);
                  return prevItemIndex + 1;
                }
                // 현재 스토리의 마지막 아이템이면 다음 스토리로
                else if (prevIndex < storiesRef.current.length - 1) {
                  setStoryProgress(0);
                  setIsImageLoaded(false);
                  return 0; // 다음 스토리의 첫 번째 아이템
                }
                // 마지막 스토리의 마지막 아이템이면 닫기
                else {
                  setTimeout(() => {
                    closeStoryViewer();
                  }, 300);
                  return prevItemIndex;
                }
              });

              // 다음 스토리로 이동
              const story = storiesRef.current[prevIndex];
              if (
                story &&
                prevIndex < storiesRef.current.length - 1 &&
                currentStoryItemIndex >= story.items.length - 1
              ) {
                return prevIndex + 1;
              }
              return prevIndex;
            });
          }
          return 100;
        }
        return newProgress;
      });
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [
    showStoryViewer,
    isImageLoaded,
    currentStoryIndex,
    currentStoryItemIndex,
    closeStoryViewer,
    showViewersModal,
  ]);

  // 키보드 네비게이션 (좌우 화살표)
  useEffect(() => {
    if (!showStoryViewer) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        goToPrevStoryItem();
      } else if (e.key === "ArrowRight") {
        goToNextStoryItem();
      } else if (e.key === "Escape") {
        closeStoryViewer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showStoryViewer, goToNextStoryItem, goToPrevStoryItem, closeStoryViewer]);

  console.log("내 ID (user.id):", user?.id);
  console.log("내 ID (user.userId):", user?.userId);

  // 만약 posts가 있다면 첫 번째 글의 작성자 ID도 확인
  if (posts.length > 0) {
    console.log("글쓴이 ID (post.user.id):", posts[0].user.id);
    console.log("타입 비교:", typeof user?.id, typeof posts[0].user.id);
  }
  return (
    <>
      <LeftSidebar />
      <RightSidebar />
      <BottomNav />

      <Container $darkMode={isDarkMode}>
        <MobileHeader $darkMode={isDarkMode}>
          <LogoImage
            src={isDarkMode ? "/unigen_white.png" : "/unigen_black.png"}
            alt="Unigen"
          />
          <MobileIcons>
            <IconButton>
              <Heart size={24} />
            </IconButton>
          </MobileIcons>
        </MobileHeader>

        <MainContent>
          <Stories $darkMode={isDarkMode}>
            {storiesLoading ? (
              <LoadingContainer
                $darkMode={isDarkMode}
                style={{ padding: "20px" }}
              >
                <Loader2 size={24} className="spinner" />
              </LoadingContainer>
            ) : (
              <>
                <Story onClick={() => navigate("/normal/story-create")}>
                  <StoryAvatar>
                    <MyStoryRing>
                      <span>👤</span>
                      <AddStoryButton>
                        <Plus size={16} strokeWidth={3} />
                      </AddStoryButton>
                    </MyStoryRing>
                  </StoryAvatar>
                  <StoryName $darkMode={isDarkMode}>내 스토리</StoryName>
                </Story>
                {stories.map((story, index) => (
                  <Story key={story.id} onClick={() => openStoryViewer(index)}>
                    <StoryAvatar>
                      <StoryRing>
                        {story.user.avatar ? (
                          <img src={story.user.avatar} alt={story.user.name} />
                        ) : (
                          <span>👤</span>
                        )}
                      </StoryRing>
                    </StoryAvatar>
                    <StoryName $darkMode={isDarkMode}>
                      {story.user.name}
                    </StoryName>
                  </Story>
                ))}
              </>
            )}
          </Stories>

          <Feed>
            {posts.map((post) => (
              <Post key={post.id} $darkMode={isDarkMode}>
                <PostHeader>
                  <UserInfo>
                    <Avatar>
                      {post.user.avatar && (
                        <img src={post.user.avatar} alt="" />
                      )}
                    </Avatar>
                    <Username $darkMode={isDarkMode}>{post.user.name}</Username>
                  </UserInfo>
                  {user?.id === post.user.id && (
                    <div style={{ position: "relative" }}>
                      <MoreButton
                        $darkMode={isDarkMode}
                        onClick={() => toggleMenu(post.id)}
                      >
                        <MoreHorizontal size={24} />
                      </MoreButton>

                      {/* 메뉴 드롭다운 */}
                      {activateMenuPostId === post.id && (
                        <>
                          {/* 메뉴 밖 클릭 시 닫기 위한 투명 배경 */}
                          <MenuOverlay
                            onClick={() => setActivateMenuPostId(null)}
                          />

                          <DropdownMenu $darkMode={isDarkMode}>
                            <MenuItem
                              onClick={() => handleUpdate(post)}
                              $darkMode={isDarkMode}
                            >
                              수정
                            </MenuItem>
                            <MenuItem
                              onClick={() => handleDelete(post.id)}
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
                </PostHeader>

                <PostImage
                  src={post.image}
                  alt="게시물 이미지"
                  onDoubleClick={() => handleLike(post.id)}
                />

                <PostActions>
                  <LeftActions>
                    <ActionButton
                      onClick={() => handleLike(post.id)}
                      $liked={post.liked}
                      $darkMode={isDarkMode}
                    >
                      <Heart
                        size={24}
                        fill={post.liked ? "#ed4956" : "none"}
                        color={
                          post.liked
                            ? "#ed4956"
                            : isDarkMode
                            ? "#fff"
                            : "#262626"
                        }
                        strokeWidth={post.liked ? 2 : 1.5}
                      />
                    </ActionButton>
                    <ActionButton $darkMode={isDarkMode}>
                      <MessageCircle size={24} strokeWidth={1.5} />
                    </ActionButton>
                    <ActionButton $darkMode={isDarkMode}>
                      <Send size={24} strokeWidth={1.5} />
                    </ActionButton>
                  </LeftActions>
                </PostActions>

                <PostInfo>
                  <Likes $darkMode={isDarkMode}>
                    좋아요 {post.likes.toLocaleString()}개
                  </Likes>
                  <Caption $darkMode={isDarkMode}>
                    <Username $darkMode={isDarkMode}>{post.user.name}</Username>{" "}
                    {post.caption}
                  </Caption>
                  <Comments
                    $darkMode={isDarkMode}
                    onClick={() => handleShowComments(post.id)}
                  >
                    댓글 12개 모두 보기
                  </Comments>
                  <Timestamp $darkMode={isDarkMode}>{post.timestamp}</Timestamp>
                </PostInfo>

                <CommentInput>
                  <input placeholder="댓글 달기..." />
                  <PostButton>게시</PostButton>
                </CommentInput>
              </Post>
            ))}

            {/* 무한 스크롤 트리거 */}
            <LoadingTrigger ref={observerTarget} />

            {/* 로딩 인디케이터 */}
            {loading && (
              <LoadingContainer $darkMode={isDarkMode}>
                <Loader2 size={32} className="spinner" />
                <LoadingText $darkMode={isDarkMode}>로딩 중...</LoadingText>
              </LoadingContainer>
            )}

            {/* 더 이상 포스트가 없을 때 */}
            {!hasMore && posts.length > 0 && (
              <EndMessage $darkMode={isDarkMode}>
                모든 포스트를 확인했습니다 🎉
              </EndMessage>
            )}
          </Feed>
        </MainContent>

        {/* 댓글 모달 부분 시작 */}
        {showComments && (
          <CommentsOverlay onClick={() => setShowComments(null)}>
            <CommentsModal onClick={(e) => e.stopPropagation()}>
              {/* [깔끔하게 변수 처리] 현재 보고 있는 포스트 찾기 */}
              {(() => {
                const selectedPost = posts.find((p) => p.id === showComments);
                if (!selectedPost) return null; // 삭제된 글이면 아무것도 안 보여줌

                return (
                  <ModalContent>
                    {/* 왼쪽: 이미지 영역 */}
                    <ModalLeft>
                      <PostImageModal
                        src={selectedPost.image}
                        alt="post info"
                      />
                    </ModalLeft>

                    {/* 오른쪽: 헤더 + 댓글(본문) + 입력창 */}
                    <ModalRight>
                      {/* 1. 모달 헤더 (여기에 ... 버튼 추가됨) */}
                      <ModalHeader $darkMode={isDarkMode}>
                        <UserInfo>
                          <Avatar>
                            {selectedPost.user.avatar ? (
                              <img src={selectedPost.user.avatar} alt="" />
                            ) : (
                              "👤"
                            )}
                          </Avatar>
                          <Username $darkMode={isDarkMode}>
                            {selectedPost.user.name}
                          </Username>

                          {/* 팔로우 버튼 (내 글 아닐 때만 & 팔로우 안 했을 때만) */}
                          {!followStatusLoading && !isMine && (
                            <FollowButton
                              onClick={handleFollow}
                              $isFollowing={isFollowingUser}
                              disabled={followLoading}
                            >
                              {followLoading
                                ? "..."
                                : isFollowingUser
                                ? "팔로잉"
                                : "팔로우"}
                            </FollowButton>
                          )}
                        </UserInfo>

                        {/* ★ [핵심] 내 글일 때만 수정/삭제 메뉴 표시 */}
                        {user?.id === selectedPost.user.id && (
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

                      {/* 2. 댓글 목록 섹션 (하드코딩 삭제됨) */}
                      <CommentsSection>
                        {/* 게시물 본문(Caption)을 첫 번째 댓글처럼 표시 */}
                        <CommentItem>
                          <CommentAvatar>
                            {selectedPost.user.avatar ? (
                              <img src={selectedPost.user.avatar} alt="" />
                            ) : (
                              "👤"
                            )}
                          </CommentAvatar>
                          <CommentContent>
                            <CommentUsername $darkMode={isDarkMode}>
                              {selectedPost.user.name}
                            </CommentUsername>
                            <CommentText $darkMode={isDarkMode}>
                              {selectedPost.caption}
                            </CommentText>
                            <CommentTime $darkMode={isDarkMode}>
                              {selectedPost.timestamp}
                            </CommentTime>
                          </CommentContent>
                        </CommentItem>

                        {/* 여기에 실제 댓글 리스트 매핑 (현재는 API가 댓글을 안 줘서 비워둠) */}
                        {/* {selectedPost.comments.map(comment => ...)} */}
                      </CommentsSection>

                      {/* 3. 하단 액션 버튼 (좋아요 등) */}
                      <ModalActions>
                        <ActionButtons>
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
                            <MessageCircle size={24} strokeWidth={1.5} />
                          </ActionButton>
                          <ActionButton>
                            <Send size={24} strokeWidth={1.5} />
                          </ActionButton>
                        </ActionButtons>
                        <Likes $darkMode={isDarkMode}>
                          좋아요 {selectedPost.likes.toLocaleString()}개
                        </Likes>
                        <Timestamp $darkMode={isDarkMode}>
                          {selectedPost.timestamp}
                        </Timestamp>
                      </ModalActions>

                      {/* 4. 댓글 입력창 */}
                      <CommentInputBox>
                        <input placeholder="댓글 달기..." />
                        <PostButton>게시</PostButton>
                      </CommentInputBox>
                    </ModalRight>
                  </ModalContent>
                );
              })()}
            </CommentsModal>
          </CommentsOverlay>
        )}

        {/* 스토리 뷰어 */}
        {showStoryViewer &&
          stories[currentStoryIndex] &&
          stories[currentStoryIndex].items[currentStoryItemIndex] && (
            <StoryViewerOverlay onClick={closeStoryViewer}>
              <StoryViewerContainer onClick={(e) => e.stopPropagation()}>
                {/* 진행 바 */}
                <StoryProgressContainer>
                  {stories[currentStoryIndex].items.map((_, index) => (
                    <StoryProgressBar key={index}>
                      <StoryProgressFill
                        $active={index === currentStoryItemIndex}
                        $completed={index < currentStoryItemIndex}
                        $progress={
                          index === currentStoryItemIndex ? storyProgress : 0
                        }
                      />
                    </StoryProgressBar>
                  ))}
                </StoryProgressContainer>

                {/* 헤더 */}
                <StoryHeader>
                  <UserInfo>
                    <Avatar>
                      {stories[currentStoryIndex].user.avatar ? (
                        <img
                          src={stories[currentStoryIndex].user.avatar}
                          alt={stories[currentStoryIndex].user.name}
                        />
                      ) : (
                        "👤"
                      )}
                    </Avatar>
                    <StoryUsername>
                      {stories[currentStoryIndex].user.name}
                    </StoryUsername>
                    <StoryTime>
                      {stories[currentStoryIndex].items[currentStoryItemIndex]
                        ?.timestamp || "방금 전"}
                    </StoryTime>
                  </UserInfo>
                  <StoryCloseButton onClick={closeStoryViewer}>
                    ✕
                  </StoryCloseButton>
                </StoryHeader>

                {/* 스토리 컨텐츠 */}
                <StoryContent>
                  <StoryImage
                    src={
                      stories[currentStoryIndex].items[currentStoryItemIndex]
                        .url
                    }
                    alt="Story"
                    onLoad={() => setIsImageLoaded(true)}
                    onError={() => {
                      console.error("스토리 이미지 로드 실패");
                      setIsImageLoaded(true); // 에러 시에도 다음으로 진행
                    }}
                  />
                </StoryContent>

                {/* 네비게이션 영역 */}
                <StoryNavLeft
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevStoryItem();
                  }}
                />
                <StoryNavRight
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNextStoryItem();
                  }}
                />

                {/* 하단 인터랙션 */}
                <StoryFooter>
                  {/* 내 스토리일 때 활동 버튼 표시 */}
                  {isCurrentStoryMine && (
                    <ActivityButton
                      onClick={(e) => {
                        e.stopPropagation();
                        openViewersModal();
                      }}
                    >
                      활동
                    </ActivityButton>
                  )}
                  <StoryReplyInput>
                    <input placeholder="메시지 보내기" />
                    <StoryActionIcons>
                      <Heart size={24} />
                      <Send size={24} />
                    </StoryActionIcons>
                  </StoryReplyInput>
                </StoryFooter>

                {/* 조회자 모달 */}
                {showViewersModal && (
                  <ViewersModalOverlay
                    onClick={(e) => {
                      e.stopPropagation();
                      closeViewersModal();
                    }}
                  >
                    <ViewersModal onClick={(e) => e.stopPropagation()}>
                      <ViewersModalHeader>
                        <ViewersModalTitle>스토리 조회자</ViewersModalTitle>
                        <ViewersModalCloseButton onClick={closeViewersModal}>
                          ✕
                        </ViewersModalCloseButton>
                      </ViewersModalHeader>
                      <ViewersModalContent>
                        {viewersLoading ? (
                          <ViewersLoadingContainer>
                            <Loader2 size={24} className="spinner" />
                            <span>로딩 중...</span>
                          </ViewersLoadingContainer>
                        ) : storyViewers.length === 0 ? (
                          <ViewersEmptyMessage>
                            아직 조회한 사람이 없습니다.
                          </ViewersEmptyMessage>
                        ) : (
                          storyViewers.map((viewer) => (
                            <ViewerItem key={viewer.userId}>
                              <ViewerAvatar>
                                {viewer.profileImageUrl ? (
                                  <img
                                    src={viewer.profileImageUrl}
                                    alt={viewer.userName}
                                  />
                                ) : (
                                  "👤"
                                )}
                              </ViewerAvatar>
                              <ViewerInfo>
                                <ViewerName>{viewer.userName}</ViewerName>
                                <ViewerTime>
                                  {getTimeAgo(viewer.viewedAt)}
                                </ViewerTime>
                              </ViewerInfo>
                            </ViewerItem>
                          ))
                        )}
                      </ViewersModalContent>
                    </ViewersModal>
                  </ViewersModalOverlay>
                )}
              </StoryViewerContainer>
            </StoryViewerOverlay>
          )}
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

const MobileHeader = styled.header`
  position: sticky;
  top: 0;
  background: ${(props) => (props.$darkMode ? "#000" : "white")};
  border-bottom: 1px solid
    ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;

  @media (min-width: 768px) {
    display: none;
  }
`;

const LogoImage = styled.img`
  height: 29px;
`;

const MobileIcons = styled.div`
  display: flex;
  gap: 16px;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.6;
  }
`;

const MainContent = styled.main`
  width: 100%;

  @media (min-width: 768px) {
    max-width: 630px;
    margin: 0 auto;
    padding-top: 30px;
  }
`;

const Stories = styled.div`
  background: ${(props) => (props.$darkMode ? "#000" : "white")};
  border: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  border-radius: 8px;
  padding: 16px 0;
  display: flex;
  gap: 18px;
  overflow-x: auto;
  overflow-y: hidden;
  margin-bottom: 24px;
  padding-left: 16px;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 767px) {
    border: none;
    border-radius: 0;
    border-bottom: 1px solid
      ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
    margin-bottom: 0;
    padding: 16px 0 16px 12px;
  }
`;

const Story = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 64px;
  cursor: pointer;

  &:hover {
    opacity: 0.7;
  }
`;

const StoryAvatar = styled.div`
  margin-bottom: 6px;
  position: relative;
`;

const StoryRing = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(
    45deg,
    #f09433 0%,
    #e6683c 25%,
    #dc2743 50%,
    #cc2366 75%,
    #bc1888 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  cursor: pointer;
  position: relative;

  &::after {
    content: "";
    width: 52px;
    height: 52px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  span {
    position: relative;
    z-index: 1;
    font-size: 24px;
  }

  img {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
`;

const MyStoryRing = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #fafafa;
  border: 1px solid #dbdbdb;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;

  span {
    font-size: 24px;
  }

  &:hover {
    opacity: 0.8;
  }
`;

const AddStoryButton = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #0095f6;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  svg {
    color: white;
  }

  &:hover {
    background: #1877f2;
  }
`;

const StoryName = styled.span`
  font-size: 12px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  max-width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Feed = styled.div`
  width: 100%;
`;

const Post = styled.article`
  background: ${(props) => (props.$darkMode ? "#000" : "white")};
  border: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  border-radius: 8px;
  margin-bottom: 20px;

  @media (max-width: 767px) {
    border-left: none;
    border-right: none;
    border-radius: 0;
    margin-bottom: 0;
    border-bottom: none;
  }
`;

const PostHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 4px 8px 16px;
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

const Username = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  transition: opacity 0.2s;
`;

const FollowButton = styled.button`
  margin-left: 36px;
  padding: 7px 16px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  background: ${(props) => (props.$isFollowing ? "#efefef" : "#0095f6")};
  color: ${(props) => (props.$isFollowing ? "#262626" : "#fff")};

  &:hover {
    background: ${(props) => (props.$isFollowing ? "#dbdbdb" : "#1877f2")};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;

  &:hover ${Username} {
    opacity: 0.5;
  }
`;

const Avatar = styled.div`
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

const PostImage = styled.img`
  width: 100%;
  height: auto;
  display: block;
  cursor: pointer;

  @media (min-width: 768px) {
    max-height: 600px;
    object-fit: cover;
  }
`;

const PostActions = styled.div`
  display: flex;
  justify-content: flex-start;
  padding: 4px 16px 0;
`;

const LeftActions = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
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
    `
    animation: ${likeAnimation} 0.4s ease;
  `}

  svg {
    color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  }
`;

const PostInfo = styled.div`
  padding: 0 16px 8px;
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

const Caption = styled.p`
  font-size: 14px;
  margin-bottom: 2px;
  line-height: 18px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};

  ${Username} {
    margin-right: 4px;
  }
`;

const Comments = styled.div`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#a8a8a8" : "#8e8e8e")};
  margin: 4px 0 2px;
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

const CommentInput = styled.div`
  border-top: 1px solid #efefef;
  padding: 6px 16px;
  display: flex;
  align-items: center;
  min-height: 56px;

  input {
    flex: 1;
    font-size: 14px;
    background: transparent;
    color: #262626;

    &::placeholder {
      color: #8e8e8e;
    }
  }
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
  border-left: 1px solid #dbdbdb;

  @media (max-width: 767px) {
    border-left: none;
    border-top: 1px solid #dbdbdb;
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

const CloseButton = styled.button`
  padding: 8px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.5;
  }

  svg {
    color: #262626;
  }
`;

const CommentsSection = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
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

const ModalActions = styled.div`
  border-top: 1px solid #efefef;
  padding: 8px 16px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
`;

const CommentInputBox = styled.div`
  border-top: 1px solid #efefef;
  padding: 6px 16px;
  display: flex;
  align-items: center;
  min-height: 56px;

  input {
    flex: 1;
    font-size: 14px;
    background: transparent;
    color: #262626;

    &::placeholder {
      color: #8e8e8e;
    }
  }
`;

const LoadingTrigger = styled.div`
  height: 20px;
  width: 100%;
`;

const spinAnimation = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;

  .spinner {
    animation: ${spinAnimation} 1s linear infinite;
    color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  }
`;

const LoadingText = styled.div`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#a8a8a8" : "#8e8e8e")};
`;

const EndMessage = styled.div`
  text-align: center;
  padding: 40px 20px;
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#a8a8a8" : "#8e8e8e")};
  font-weight: 500;
`;

// 스토리 뷰어 스타일
const StoryViewerOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const StoryViewerContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 500px;
  max-height: 90vh;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  @media (max-width: 767px) {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
`;

const StoryProgressContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 4px;
  padding: 8px;
  z-index: 10;
`;

const StoryProgressBar = styled.div`
  flex: 1;
  height: 2px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 1px;
  overflow: hidden;
`;

const StoryProgressFill = styled.div`
  height: 100%;
  background: white;
  width: ${(props) =>
    props.$completed ? "100%" : props.$active ? `${props.$progress}%` : "0%"};
  transition: ${(props) => (props.$active ? "none" : "width 0.3s ease")};
`;

const StoryHeader = styled.div`
  position: absolute;
  top: 16px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  z-index: 10;
`;

const StoryUsername = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: white;
`;

const StoryTime = styled.span`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
`;

const StoryCloseButton = styled.button`
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  border-radius: 50%;
  border: none;
  outline: none;
  padding: 0;
  background: transparent;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 24px;
  transition: background 0.2s;
  box-sizing: border-box;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &:focus {
    outline: none;
  }
`;

const StoryContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
`;

const StoryImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const StoryNavLeft = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  cursor: pointer;
  z-index: 5;
`;

const StoryNavRight = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 70%;
  cursor: pointer;
  z-index: 5;
`;

const StoryFooter = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  z-index: 10;
`;

const StoryReplyInput = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 24px;
  padding: 8px 16px;

  input {
    flex: 1;
    background: transparent;
    color: white;
    font-size: 14px;

    &::placeholder {
      color: rgba(255, 255, 255, 0.6);
    }
  }
`;

const StoryActionIcons = styled.div`
  display: flex;
  gap: 12px;

  svg {
    color: white;
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.7;
    }
  }
`;
/* ==========================================
   1. 게시글 수정/삭제 메뉴 스타일 (기존 HEAD)
   ========================================== */
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

/* ==========================================
   2. 스토리 활동/조회자 모달 스타일 (기존 origin)
   ========================================== */

// 활동 버튼 스타일
const ActivityButton = styled.button`
  position: absolute;
  left: 16px;
  bottom: 80px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  padding: 8px 16px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 15;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  &:active {
    transform: scale(0.95);
  }
`;

// 조회자 모달 오버레이
const ViewersModalOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 20;
`;

const ViewersModal = styled.div`
  width: 100%;
  max-height: 60%;
  background: #262626;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ViewersModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #363636;
`;

const ViewersModalTitle = styled.h3`
  color: white;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
`;

const ViewersModalCloseButton = styled.button`
  background: transparent;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;

  &:hover {
    opacity: 0.7;
  }
`;

const ViewersModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
`;

const ViewersLoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;
  color: white;

  .spinner {
    animation: ${spinAnimation} 1s linear infinite;
  }
`;

const ViewersEmptyMessage = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #a8a8a8;
  font-size: 14px;
`;

const ViewerItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  transition: background 0.2s;

  &:hover {
    background: #363636;
  }
`;

const ViewerAvatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: #fafafa;
  border: 1px solid #dbdbdb;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ViewerInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ViewerName = styled.div`
  color: white;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ViewerTime = styled.div`
  color: #a8a8a8;
  font-size: 12px;
  margin-top: 2px;
`;

export default Home;
