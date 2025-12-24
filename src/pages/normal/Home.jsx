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
import { getTimeAgo } from "../../util/date";

const baseURL = import.meta.env.VITE_BASE_URL;

const Home = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useApp();
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
        const transformedStories = data.stories
          .filter((story) => story && story.items && story.items.length > 0)
          .map((story) => ({
            id: story.userId,
            user: {
              name: story.author?.name || "알 수 없음",
              avatar: story.author?.profileImageUrl
                ? `${baseURL}${story.author.profileImageUrl}`
                : null,
            },
            items: story.items.map((item) => ({
              id: item.id,
              type: "image",
              url: `${baseURL}${item.imageUrl}`,
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
  const loadPosts = useCallback(async (pageNum) => {
    // 이미 로드 중이거나, 더 이상 데이터가 없거나, 이미 로드된 페이지면 스킵
    if (loading || !hasMore || loadedPagesRef.current.has(pageNum)) return;

    loadedPagesRef.current.add(pageNum); // 페이지 로딩 시작 표시
    setLoading(true);

    try {
      const data = await getPosts("normal", pageNum, POSTS_PER_PAGE);
      console.log(`페이지 ${pageNum} 로드:`, data.items[0]);

      // API 데이터를 posts 형식으로 변환
      const transformedPosts = data.items.map((item) => ({
        id: item.id,
        user: {
          id: item.author.id || item.authorId,
          name: item.author.name,
          avatar: item.author.profileImageUrl,
        },
        image: `${baseURL}${item.imageUrl}`,
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

      setHasMore(data.items.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error("포스트 로딩 실패:", error);
      loadedPagesRef.current.delete(pageNum); // 실패시 재시도 가능하도록
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const openStoryViewer = useCallback((storyIndex) => {
    setCurrentStoryIndex(storyIndex);
    setCurrentStoryItemIndex(0);
    setStoryProgress(0);
    setIsImageLoaded(false);
    progressCompleteRef.current = false;
    setShowStoryViewer(true);
  }, []);

  const closeStoryViewer = useCallback(() => {
    setShowStoryViewer(false);
    setCurrentStoryIndex(0);
    setCurrentStoryItemIndex(0);
    setStoryProgress(0);
    setIsImageLoaded(false);
    progressCompleteRef.current = false;
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

  // 스토리 자동 진행
  useEffect(() => {
    if (!showStoryViewer || !isImageLoaded) return;

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
          // 마지막 스토리의 마지막 아이템이면 100%에서 멈춤
          if (isLastStoryItem) {
            clearInterval(interval);
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
                return prevItemIndex;
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
                    <Avatar>{post.user.avatar}</Avatar>
                    <Username $darkMode={isDarkMode}>{post.user.name}</Username>
                  </UserInfo>
                  <MoreButton $darkMode={isDarkMode}>
                    <MoreHorizontal size={24} />
                  </MoreButton>
                </PostHeader>

                <PostImage
                  src={post.image}
                  alt=""
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

        {showComments && (
          <CommentsOverlay onClick={() => setShowComments(null)}>
            <CommentsModal onClick={(e) => e.stopPropagation()}>
              <ModalContent>
                <ModalLeft>
                  <PostImageModal
                    src={posts.find((p) => p.id === showComments)?.image}
                    alt=""
                  />
                </ModalLeft>
                <ModalRight>
                  <ModalHeader $darkMode={isDarkMode}>
                    <UserInfo>
                      <Avatar>
                        {posts.find((p) => p.id === showComments)?.user.avatar}
                      </Avatar>
                      <Username $darkMode={isDarkMode}>
                        {posts.find((p) => p.id === showComments)?.user.name}
                      </Username>
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
                  </ModalHeader>

                  <CommentsSection>
                    <CommentItem>
                      <CommentAvatar>
                        {posts.find((p) => p.id === showComments)?.user.avatar}
                      </CommentAvatar>
                      <CommentContent>
                        <CommentUsername $darkMode={isDarkMode}>
                          {posts.find((p) => p.id === showComments)?.user.name}
                        </CommentUsername>
                        <CommentText $darkMode={isDarkMode}>
                          {posts.find((p) => p.id === showComments)?.caption}
                        </CommentText>
                        <CommentTime $darkMode={isDarkMode}>
                          {posts.find((p) => p.id === showComments)?.timestamp}
                        </CommentTime>
                      </CommentContent>
                    </CommentItem>

                    <CommentItem>
                      <CommentAvatar>👴</CommentAvatar>
                      <CommentContent>
                        <CommentUsername $darkMode={isDarkMode}>
                          최할아버지
                        </CommentUsername>
                        <CommentText $darkMode={isDarkMode}>
                          정말 아름다운 사진이네요!
                        </CommentText>
                        <CommentTime $darkMode={isDarkMode}>
                          1시간 전
                        </CommentTime>
                      </CommentContent>
                    </CommentItem>

                    <CommentItem>
                      <CommentAvatar>👵</CommentAvatar>
                      <CommentContent>
                        <CommentUsername $darkMode={isDarkMode}>
                          정할머니
                        </CommentUsername>
                        <CommentText $darkMode={isDarkMode}>
                          저도 가보고 싶어요 ㅎㅎ
                        </CommentText>
                        <CommentTime $darkMode={isDarkMode}>
                          30분 전
                        </CommentTime>
                      </CommentContent>
                    </CommentItem>

                    <CommentItem>
                      <CommentAvatar>👴</CommentAvatar>
                      <CommentContent>
                        <CommentUsername $darkMode={isDarkMode}>
                          강할아버지
                        </CommentUsername>
                        <CommentText $darkMode={isDarkMode}>
                          날씨가 참 좋았겠습니다
                        </CommentText>
                        <CommentTime $darkMode={isDarkMode}>
                          15분 전
                        </CommentTime>
                      </CommentContent>
                    </CommentItem>
                  </CommentsSection>

                  <ModalActions>
                    <ActionButtons>
                      <ActionButton onClick={() => handleLike(showComments)}>
                        <Heart
                          size={24}
                          fill={
                            posts.find((p) => p.id === showComments)?.liked
                              ? "#ed4956"
                              : "none"
                          }
                          color={
                            posts.find((p) => p.id === showComments)?.liked
                              ? "#ed4956"
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
                    <Likes>
                      좋아요{" "}
                      {posts
                        .find((p) => p.id === showComments)
                        ?.likes.toLocaleString()}
                      개
                    </Likes>
                    <Timestamp>
                      {posts.find((p) => p.id === showComments)?.timestamp}
                    </Timestamp>
                  </ModalActions>

                  <CommentInputBox>
                    <input placeholder="댓글 달기..." />
                    <PostButton>게시</PostButton>
                  </CommentInputBox>
                </ModalRight>
              </ModalContent>
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
                    <StoryTime>5분 전</StoryTime>
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
                  <StoryReplyInput>
                    <input placeholder="메시지 보내기" />
                    <StoryActionIcons>
                      <Heart size={24} />
                      <Send size={24} />
                    </StoryActionIcons>
                  </StoryReplyInput>
                </StoryFooter>
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
  border-radius: 50%;
  background: transparent;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 24px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
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

export default Home;
