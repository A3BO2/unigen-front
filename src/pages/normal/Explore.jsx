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
      const transformedFeeds = await Promise.all(
        feedData.items.map(async (item) => {
          // 각 게시물의 좋아요 상태 확인
          let liked = false;
          try {
            const likeStatus = await isPostLike(item.id);
            liked = likeStatus.isLiked || false;
          } catch (error) {
            console.error(`좋아요 상태 확인 실패 (postId: ${item.id}):`, error);
          }

          return {
            id: item.id,
            type: "feed",
            image: resolveUrl(item.imageUrl),
            likes: item.likeCount,
            comments: item.commentCount,
            user: {
              id: item.author.id || item.authorId,
              username: item.author.username || "사용자",
              avatar: item.author.profileImageUrl || null,
            },
            caption: item.content || "",
            timestamp: item.createdAt || "",
            liked: liked,
          };
        })
      );

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
  }, []); // 의존성 배열 제거 - ref를 통해 최신 값 참조

  // 마지막 요소를 관찰하는 ref callback
  const lastPostElementRef = useCallback(
    (node) => {
      if (loadingRef.current) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current) {
          loadMoreData();
        }
      });
      if (node) observer.current.observe(node);
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

      try {
        const response = await isFollowing(selectedPost.user.id);
        setIsFollowingUser(response.isFollowing);
        setIsMine(response.isMine);

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
      } catch (error) {
        console.error("팔로우 상태 확인 실패:", error);
        setIsFollowingUser(false);
        setIsMine(false);
      }
    };

    checkFollowStatus();
  }, [selectedPost]); // selectedPost 변경 시에만 실행

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
    try {
      if (isFollowingUser) {
        // 언팔로우
        await unfollowUser(selectedPost.user.id);
        setIsFollowingUser(false);
      } else {
        // 팔로우
        await followUser(selectedPost.user.id);
        setIsFollowingUser(true);
      }
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
              // 마지막 요소에 ref 연결
              if (explorePosts.length === index + 1) {
                return (
                  <GridItem
                    key={`${post.type}-${post.id}`}
                    ref={lastPostElementRef}
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
                            <MessageCircle
                              size={20}
                              fill="white"
                              color="white"
                            />
                            <span>{post.comments.toLocaleString()}</span>
                          </Stat>
                        </Stats>
                      </Overlay>
                    </ImageWrapper>
                  </GridItem>
                );
              } else {
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
                            <MessageCircle
                              size={20}
                              fill="white"
                              color="white"
                            />
                            <span>{post.comments.toLocaleString()}</span>
                          </Stat>
                        </Stats>
                      </Overlay>
                    </ImageWrapper>
                  </GridItem>
                );
              }
            })}
          </Grid>
          {loading && (
            <LoadingText $darkMode={isDarkMode}>로딩 중...</LoadingText>
          )}
        </MainContent>
      </Container>

      {/* 피드 상세 모달 */}
      {selectedPost && (
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
        />
      )}
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

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 767px) {
    grid-template-columns: repeat(1, 1fr);
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

// 릴스 표시 아이콘
const ReelIndicator = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
`;

export default Explore;
