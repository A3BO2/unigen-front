import styled from "styled-components";
import LeftSidebar from "../../components/normal/LeftSidebar";
import RightSidebar from "../../components/normal/RightSidebar";
import BottomNav from "../../components/normal/BottomNav";
import PostDetailModal from "../../components/normal/PostDetailModal";
import { Heart, MessageCircle, Play } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPosts,
  getReel,
  deletePost,
  likePost,
  unlikePost,
  isPostLike,
} from "../../services/post";
import { isFollowing, followUser, unfollowUser } from "../../services/user";

const Explore = () => {
  const { isDarkMode, user } = useApp();
  const navigate = useNavigate();
  const [explorePosts, setExplorePosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null); // 선택된 피드 상세보기
  const [isFollowingUser, setIsFollowingUser] = useState(false); // 팔로우 상태
  const [isMine, setIsMine] = useState(false); // 내 게시물인지 여부
  const [followLoading, setFollowLoading] = useState(false); // 팔로우 로딩 상태
  const observer = useRef();
  const isInitialMount = useRef(true); // 초기 마운트 추적
  const isModalOpening = useRef(false); // 모달이 열리는 중인지 추적
  const isModalClosing = useRef(false); // 모달이 닫히는 중인지 추적

  const resolveUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url; // S3
    return `${import.meta.env.VITE_BASE_URL}${
      url.startsWith("/") ? "" : "/"
    }${url}`;
  };

  // 최신 값을 참조하기 위한 ref
  const loadingRef = useRef(loading);
  const hasMoreRef = useRef(hasMore);
  const pageRef = useRef(page);
  const nextCursorRef = useRef(nextCursor);

  // ref 업데이트
  useEffect(() => {
    loadingRef.current = loading;
    hasMoreRef.current = hasMore;
    pageRef.current = page;
    nextCursorRef.current = nextCursor;
  }, [loading, hasMore, page, nextCursor]);

  // 배열을 랜덤으로 섞는 함수
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // 데이터 로드 함수
  const loadMoreData = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;

    setLoading(true);
    try {
      // Feed 데이터 가져오기
      const feedData = await getPosts(undefined, pageRef.current, 14, true);
      const transformedFeeds = feedData.items.map((item) => {
        const authorId = item.author.id || item.authorId;

        return {
          id: item.id,
          type: "feed",
          image: resolveUrl(item.imageUrl),
          likes: item.likeCount,
          comments: item.commentCount,
          user: {
            id: authorId,
            username: item.author.username || "사용자",
            avatar: item.author.profileImageUrl || null,
            isFollowing: undefined, // 초기값
          },
          caption: item.content || "",
          timestamp: item.createdAt || "",
          liked: false,
        };
      });

      // 좋아요 및 팔로우 상태 백그라운드에서 확인
      transformedFeeds.forEach(async (item) => {
        const authorId = item.user.id;

        // 좋아요 상태 확인
        try {
          const likeStatus = await isPostLike(item.id);
          setExplorePosts((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? { ...p, liked: likeStatus.isLiked || false }
                : p
            )
          );
        } catch (error) {
          console.error(`좋아요 상태 확인 실패 (postId: ${item.id}):`, error);
        }

        // 팔로우 상태 확인 (내 게시물이 아닐 때만)
        if (authorId && authorId !== user?.id) {
          try {
            const followRes = await isFollowing(authorId);
            const followingStatus = followRes?.isFollowing || false;

            setExplorePosts((prev) =>
              prev.map((p) =>
                p.user.id === authorId
                  ? { ...p, user: { ...p.user, isFollowing: followingStatus } }
                  : p
              )
            );
          } catch (error) {
            console.error(
              `팔로우 상태 확인 실패 (userId: ${authorId}):`,
              error
            );
          }
        }
      });

      // Reel 데이터 가져오기 (한 개)
      let transformedReel = null;
      try {
        const reelData = await getReel(nextCursorRef.current);
        if (reelData.reel) {
          // 릴스의 좋아요 상태 확인
          let liked = false;
          try {
            const likeStatus = await isPostLike(reelData.reel.id);
            liked = likeStatus.isLiked || false;
          } catch (error) {
            console.error(
              `좋아요 상태 확인 실패 (reelId: ${reelData.reel.id}):`,
              error
            );
          }

          transformedReel = {
            id: reelData.reel.id,
            type: "reel",
            image: resolveUrl(reelData.reel.image_url), // 🔥 릴스 썸네일
            likes: reelData.reel.like_count,
            comments: reelData.reel.comment_count,
            user: {
              id: reelData.reel.author_id,
              name: reelData.reel.authorName || "사용자",
              avatar: reelData.reel.authorProfile || null,
            },
            caption: reelData.reel.content || "",
            timestamp: reelData.reel.created_at || "",
            liked: liked,
          };
          setNextCursor(reelData.nextCursor);
        }
      } catch {
        // Reel 데이터 없음 (정상)
      }

      // Feed와 Reel을 합치고 랜덤으로 섞기
      const newPosts = transformedReel
        ? [...transformedFeeds, transformedReel]
        : transformedFeeds;
      const shuffledNewPosts = shuffleArray(newPosts);

      setExplorePosts((prev) => [...prev, ...shuffledNewPosts]);
      setPage((prev) => prev + 1);

      // 더 이상 데이터가 없으면 hasMore를 false로 설정
      if (feedData.items.length === 0) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("데이터를 가져오는 중 오류 발생:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // user?.id 의존성 추가

  // 마지막 요소를 관찰하는 ref callback
  const lastPostElementRef = useCallback(
    (node) => {
      if (loadingRef.current) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreRef.current) {
            console.log("🔄 무한 스크롤 트리거 - 다음 페이지 로드");
            loadMoreData();
          }
        },
        {
          root: null, // viewport 사용 (배포 환경에서도 안정적)
          rootMargin: "300px", // 바닥에서 300px 위에서 미리 로드
          threshold: 0.1,
        }
      );
      if (node) {
        console.log("👀 마지막 요소 관찰 시작");
        observer.current.observe(node);
      }
    },
    [loadMoreData]
  );

  // 초기 데이터 로드
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadMoreData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 빈 배열로 초기 한 번만 실행

  // 모달 닫기 핸들러 (메모이제이션)
  const handleCloseModal = useCallback(() => {
    if (isModalClosing.current) return;
    isModalClosing.current = true;
    isModalOpening.current = false;
    setSelectedPost(null);

    // 모달 닫힘 플래그 리셋
    setTimeout(() => {
      isModalClosing.current = false;
    }, 300);
  }, []);

  // 포스트 클릭 핸들러
  const handlePostClick = useCallback(
    (e, post) => {
      e.preventDefault();
      e.stopPropagation();

      // 이미 같은 포스트의 모달이 열려있거나 모달이 열리는/닫히는 중이면 무시
      if (isModalOpening.current) return;
      if (isModalClosing.current) return;

      if (post.type === "reel") {
        // 릴스는 Reels 페이지로 이동 (해당 릴스 ID와 함께)
        navigate(`/normal/reels?startId=${post.id}`);
      } else {
        // 피드는 상세 모달 표시 - 상태 초기화 후 설정
        isModalOpening.current = true;
        isModalClosing.current = false;
        setIsFollowingUser(false);
        setIsMine(false);
        setSelectedPost(post);

        // 모달 열림 플래그 리셋 (다음 렌더링 사이클에서)
        setTimeout(() => {
          isModalOpening.current = false;
        }, 100);
      }
    },
    [navigate]
  );

  // 상세 모달이 열릴 때 팔로우 상태 확인 및 좋아요 상태 확인
  const selectedPostIdRef = useRef(null);

  useEffect(() => {
    // 모달이 닫히는 중이면 실행하지 않음
    if (isModalClosing.current) {
      selectedPostIdRef.current = null;
      return;
    }

    // selectedPost가 없으면 상태 초기화
    if (!selectedPost) {
      selectedPostIdRef.current = null;
      setIsFollowingUser(false);
      setIsMine(false);
      return;
    }

    // 같은 포스트면 중복 실행 방지
    if (selectedPostIdRef.current === selectedPost.id) return;
    selectedPostIdRef.current = selectedPost.id;

    const checkFollowStatus = async () => {
      if (!selectedPost || !selectedPost.user || !selectedPost.user.id) {
        return;
      }

      // 내 게시물인지 확인
      const isMinePost = selectedPost.user.id === user?.id;
      setIsMine(isMinePost);

      if (isMinePost) {
        setIsFollowingUser(false);
        // 좋아요 상태만 확인
        try {
          const likeStatus = await isPostLike(selectedPost.id);
          setSelectedPost((prev) => {
            if (prev && prev.id === selectedPost.id) {
              return { ...prev, liked: likeStatus.isLiked };
            }
            return prev;
          });
        } catch (error) {
          console.error("좋아요 상태 확인 실패:", error);
        }
        return;
      }

      // 이미 로드된 팔로우 상태가 있으면 즉시 사용
      if (selectedPost.user.isFollowing !== undefined) {
        setIsFollowingUser(selectedPost.user.isFollowing);
      } else {
        // 없으면 API로 확인
        try {
          const response = await isFollowing(selectedPost.user.id);
          setIsFollowingUser(response.isFollowing);

          // explorePosts 상태도 업데이트
          setExplorePosts((prev) =>
            prev.map((p) =>
              p.user.id === selectedPost.user.id
                ? {
                    ...p,
                    user: { ...p.user, isFollowing: response.isFollowing },
                  }
                : p
            )
          );
        } catch (error) {
          console.error("팔로우 상태 확인 실패:", error);
          setIsFollowingUser(false);
        }
      }

      // 좋아요 상태도 확인 (setSelectedPost를 호출하지 않고 직접 업데이트)
      try {
        const likeStatus = await isPostLike(selectedPost.id);
        // selectedPost가 여전히 같은 포스트인지 확인 후 업데이트
        setSelectedPost((prev) => {
          if (!prev || prev.id !== selectedPost.id) return prev;
          return {
            ...prev,
            liked: likeStatus.isLiked || false,
          };
        });
      } catch (error) {
        console.error("좋아요 상태 확인 실패:", error);
      }
    };

    checkFollowStatus();
  }, [selectedPost, user?.id]); // selectedPost, user?.id 변경 시에만 실행

  // 팔로우/언팔로우 핸들러
  const handleFollow = async (e) => {
    // 1. 이벤트 객체(e)를 파라미터로 받음
    // 2. 이벤트가 존재하면 전파 중단 및 기본 동작 방지
    if (e) {
      e.preventDefault(); // 링크 이동 방지
      e.stopPropagation(); // 부모 요소로의 클릭 이벤트 전파 방지 (프로필 이동 방지)
    }

    if (!selectedPost || !selectedPost.user.id || followLoading) return;

    setFollowLoading(true);
    const newFollowState = !isFollowingUser;

    try {
      if (isFollowingUser) {
        // 언팔로우
        await unfollowUser(selectedPost.user.id);
      } else {
        // 팔로우
        await followUser(selectedPost.user.id);
      }

      setIsFollowingUser(newFollowState);

      // 같은 사용자의 모든 게시물 팔로우 상태 업데이트
      setExplorePosts((prev) =>
        prev.map((p) =>
          p.user.id === selectedPost.user.id
            ? { ...p, user: { ...p.user, isFollowing: newFollowState } }
            : p
        )
      );
    } catch (error) {
      console.error("팔로우/언팔로우 요청 실패:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  // 좋아요 핸들러
  const handleLike = async (postId) => {
    const target = explorePosts.find((p) => p.id === postId);
    if (!target) return;

    // Optimistic update
    const wasLiked = target.liked;
    setExplorePosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
    // 선택된 포스트도 업데이트
    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost((prev) => ({
        ...prev,
        liked: !prev.liked,
        likes: prev.liked ? prev.likes - 1 : prev.likes + 1,
      }));
    }

    // API 호출
    try {
      if (wasLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    } catch (error) {
      console.error("좋아요 실패 → 롤백", error);
      // 실패 시 롤백
      setExplorePosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                liked: wasLiked,
                likes: wasLiked ? post.likes + 1 : post.likes - 1,
              }
            : post
        )
      );
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost((prev) => ({
          ...prev,
          liked: wasLiked,
          likes: wasLiked ? prev.likes + 1 : prev.likes - 1,
        }));
      }
    }
  };

  // 모달용 좋아요 핸들러
  const handleModalLike = (postId) => {
    handleLike(postId);
  };

  // 수정 핸들러
  const handleUpdate = async (post) => {
    navigate(`/feed/update/${post.id}`, {
      state: {
        content: post.caption || post.content,
        imageUrl: post.image,
      },
    });
  };

  // 삭제 핸들러
  const handleDelete = async (postId) => {
    if (!window.confirm("정말로 게시물을 삭제하시겠습니까?")) return;

    try {
      await deletePost(postId);
      alert("삭제되었습니다.");

      // explorePosts에서 삭제
      setExplorePosts((prev) => prev.filter((post) => post.id !== postId));

      // 모달 창이 열려있었다면 닫기
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(null);
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "삭제 실패");
    }
  };

  return (
    <>
      <LeftSidebar />
      <RightSidebar />
      <BottomNav />

      <Container $darkMode={isDarkMode}>
        <MainContent>
          <Grid>
            {explorePosts.map((post, index) => {
              return (
                <GridItem
                  key={`${post.type}-${post.id}`}
                  onClick={(e) => handlePostClick(e, post)}
                >
                  <ImageWrapper>
                    <Image src={post.image} alt="" />
                    {post.type === "reel" && (
                      <ReelIndicator>
                        <Play size={20} fill="white" color="white" />
                      </ReelIndicator>
                    )}
                    <Overlay>
                      <Stats>
                        <Stat>
                          <Heart size={20} fill="white" color="white" />
                          <span>{post.likes.toLocaleString()}</span>
                        </Stat>
                        <Stat>
                          <MessageCircle size={20} fill="white" color="white" />
                          <span>{post.comments.toLocaleString()}</span>
                        </Stat>
                      </Stats>
                    </Overlay>
                  </ImageWrapper>
                </GridItem>
              );
            })}
          </Grid>

          {/* 무한 스크롤 트리거 요소 */}
          {hasMore && !loading && <LoadingTrigger ref={lastPostElementRef} />}

          {loading && (
            <LoadingText $darkMode={isDarkMode}>로딩 중...</LoadingText>
          )}
        </MainContent>
      </Container>

      {/* 피드 상세 모달 */}
      {selectedPost &&
        (() => {
          // 릴스를 제외한 일반 게시물만 필터링
          const feedPosts = explorePosts.filter((p) => p.type !== "reel");
          const currentPostIndex = feedPosts.findIndex(
            (p) => p.id === selectedPost.id
          );

          const handleNavigate = async (newIndex) => {
            if (newIndex >= 0 && newIndex < feedPosts.length) {
              const newPost = feedPosts[newIndex];
              // handlePostClick 로직과 동일하게 상태 설정
              isModalOpening.current = true;
              isModalClosing.current = false;
              setIsFollowingUser(false);
              setIsMine(false);
              setSelectedPost(newPost);

              setTimeout(() => {
                isModalOpening.current = false;
              }, 100);

              // 끝에서 3개 남았을 때 자동으로 다음 페이지 로드
              if (newIndex >= feedPosts.length - 3 && hasMore && !loading) {
                setPage((prev) => prev + 1);
                loadMoreData();
              }
            }
          };

          return (
            <PostDetailModal
              post={selectedPost}
              isOpen={!!selectedPost}
              onClose={handleCloseModal}
              isDarkMode={isDarkMode}
              user={user}
              onLike={handleModalLike}
              onFollow={handleFollow}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              isFollowing={isFollowingUser}
              isMine={isMine}
              followLoading={followLoading}
              getImageUrl={resolveUrl}
              postList={feedPosts}
              currentPostIndex={currentPostIndex}
              onNavigate={handleNavigate}
            />
          );
        })()}
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
    padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px));
  }
`;

const MainContent = styled.main`
  width: 100%;
  padding: 30px 0;

  @media (min-width: 768px) {
    max-width: 975px;
    margin: 0 auto;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;

  @media (max-width: 767px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
  }
`;

const GridItem = styled.div`
  position: relative;
  aspect-ratio: 1;
  cursor: pointer;
`;

const ImageWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;

  &:hover > div {
    opacity: 1;
  }
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
`;

const Stats = styled.div`
  display: flex;
  gap: 30px;
  color: white;
`;

const Stat = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;

  svg {
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
  }
`;

const LoadingText = styled.div`
  text-align: center;
  padding: 20px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  font-size: 14px;
`;

const LoadingTrigger = styled.div`
  height: 20px;
  width: 100%;
  margin: 20px 0;
`;

// 릴스 표시 아이콘
const ReelIndicator = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
`;

export default Explore;
