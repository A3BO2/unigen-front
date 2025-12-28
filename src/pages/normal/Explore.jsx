import styled from "styled-components";
import LeftSidebar from "../../components/normal/LeftSidebar";
import RightSidebar from "../../components/normal/RightSidebar";
import BottomNav from "../../components/normal/BottomNav";
import { Heart, MessageCircle, Play } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getPosts, getReel } from "../../services/post";
import { isFollowing, followUser, unfollowUser } from "../../services/user";
import { getTimeAgo } from "../../util/date";

const Explore = () => {
  const { isDarkMode } = useApp();
  const navigate = useNavigate();
  const [explorePosts, setExplorePosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null); // 선택된 피드 상세보기
  const [isFollowingUser, setIsFollowingUser] = useState(false); // 팔로우 상태
  const [isMine, setIsMine] = useState(false); // 내 게시물인지 여부
  const [followStatusLoading, setFollowStatusLoading] = useState(false); // 팔로우 상태 확인 로딩
  const [followLoading, setFollowLoading] = useState(false); // 팔로우 로딩 상태
  const observer = useRef();
  const isInitialMount = useRef(true); // 초기 마운트 추적

  const resolveUrl = (url) => {
      if (!url) return null;
      if (url.startsWith("http")) return url; // S3
      return `${import.meta.env.VITE_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
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
      const transformedFeeds = feedData.items.map((item) => ({
        id: item.id,
        type: "feed",
        image: resolveUrl(item.imageUrl),
        likes: item.likeCount,
        comments: item.commentCount,
        user: {
          id: item.author.id || item.authorId,
          name: item.author.name || "사용자",
          avatar: item.author.profileImageUrl || null,
        },
        caption: item.content || "",
        timestamp: item.createdAt || "",
        liked: false,
      }));

      // Reel 데이터 가져오기 (한 개)
      let transformedReel = null;
      try {
        const reelData = await getReel(nextCursorRef.current);
        if (reelData.reel) {
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
            liked: false,
          };
          setNextCursor(reelData.nextCursor);
        }
      } catch (error) {
        console.log("Reel 데이터 없음:", error);
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

  // 포스트 클릭 핸들러
  const handlePostClick = (post) => {
    if (post.type === "reel") {
      // 릴스는 Reels 페이지로 이동 (해당 릴스 ID와 함께)
      navigate(`/normal/reels?startId=${post.id}`);
    } else {
      // 피드는 상세 모달 표시 - 상태 초기화 후 설정
      setFollowStatusLoading(true);
      setIsFollowingUser(false);
      setIsMine(false);
      setSelectedPost(post);
    }
  };

  // 상세 모달이 열릴 때 팔로우 상태 확인
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (selectedPost && selectedPost.user.id) {
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
      } else if (!selectedPost) {
        // 모달이 닫힐 때 상태 초기화
        setFollowStatusLoading(false);
        setIsFollowingUser(false);
        setIsMine(false);
      }
    };
    checkFollowStatus();
  }, [selectedPost]);

  // 팔로우/언팔로우 핸들러
  const handleFollow = async () => {
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
  const handleLike = (postId) => {
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
                    onClick={() => handlePostClick(post)}
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
                            <span>{post.comments}</span>
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
                    onClick={() => handlePostClick(post)}
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
                            <span>{post.comments}</span>
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
        <CommentsOverlay onClick={() => setSelectedPost(null)}>
          <CommentsModal
            $darkMode={isDarkMode}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalContent>
              <ModalLeft>
                <PostImageModal src={selectedPost.image} alt="" />
              </ModalLeft>
              <ModalRight $darkMode={isDarkMode}>
                <ModalHeader $darkMode={isDarkMode}>
                  <UserInfo>
                    <Avatar>
                      {selectedPost.user.avatar ? (
                        <img
                          src={selectedPost.user.avatar}
                          alt={selectedPost.user.name}
                        />
                      ) : (
                        "👤"
                      )}
                    </Avatar>
                    <Username $darkMode={isDarkMode}>
                      {selectedPost.user.name}
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
                  <CloseButton
                    onClick={() => setSelectedPost(null)}
                    $darkMode={isDarkMode}
                  >
                    ✕
                  </CloseButton>
                </ModalHeader>

                <CommentsSection>
                  <CommentItem>
                    <CommentAvatar>
                      {selectedPost.user.avatar ? (
                        <img
                          src={selectedPost.user.avatar}
                          alt={selectedPost.user.name}
                        />
                      ) : (
                        "👤"
                      )}
                    </CommentAvatar>
                    <CommentContent>
                      <CaptionText $darkMode={isDarkMode}>
                        <CommentUsername $darkMode={isDarkMode}>
                          {selectedPost.user.name}
                        </CommentUsername>{" "}
                        {selectedPost.caption}
                      </CaptionText>
                      <CommentTime $darkMode={isDarkMode}>
                        {getTimeAgo(selectedPost.timestamp)}
                      </CommentTime>
                    </CommentContent>
                  </CommentItem>

                  {/* 샘플 댓글 */}
                  <CommentItem>
                    <CommentAvatar>👴</CommentAvatar>
                    <CommentContent>
                      <CommentText $darkMode={isDarkMode}>
                        <CommentUsername $darkMode={isDarkMode}>
                          최할아버지
                        </CommentUsername>{" "}
                        정말 아름다운 사진이네요!
                      </CommentText>
                      <CommentTime $darkMode={isDarkMode}>1시간 전</CommentTime>
                    </CommentContent>
                  </CommentItem>

                  <CommentItem>
                    <CommentAvatar>👵</CommentAvatar>
                    <CommentContent>
                      <CommentText $darkMode={isDarkMode}>
                        <CommentUsername $darkMode={isDarkMode}>
                          정할머니
                        </CommentUsername>{" "}
                        저도 가보고 싶어요 ㅎㅎ
                      </CommentText>
                      <CommentTime $darkMode={isDarkMode}>30분 전</CommentTime>
                    </CommentContent>
                  </CommentItem>
                </CommentsSection>

                <ModalActions $darkMode={isDarkMode}>
                  <ActionButtons>
                    <ActionButton
                      onClick={() => handleLike(selectedPost.id)}
                      $darkMode={isDarkMode}
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
                    <ActionButton $darkMode={isDarkMode}>
                      <MessageCircle size={24} strokeWidth={1.5} />
                    </ActionButton>
                  </ActionButtons>
                  <Likes $darkMode={isDarkMode}>
                    좋아요 {selectedPost.likes.toLocaleString()}개
                  </Likes>
                  <Timestamp $darkMode={isDarkMode}>
                    {getTimeAgo(selectedPost.timestamp)}
                  </Timestamp>
                </ModalActions>

                <CommentInputBox $darkMode={isDarkMode}>
                  <input placeholder="댓글 달기..." />
                  <PostButton>게시</PostButton>
                </CommentInputBox>
              </ModalRight>
            </ModalContent>
          </CommentsModal>
        </CommentsOverlay>
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
    padding-bottom: 60px;
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

// 모달 관련 스타일
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
  background: ${(props) => (props.$darkMode ? "#262626" : "white")};
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
    flex-direction: column;
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
  border-left: 1px solid ${(props) => (props.$darkMode ? "#363636" : "#dbdbdb")};
  background: ${(props) => (props.$darkMode ? "#000" : "white")};

  @media (max-width: 767px) {
    border-left: none;
    border-top: 1px solid
      ${(props) => (props.$darkMode ? "#363636" : "#dbdbdb")};
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

const Username = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
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

const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  transition: background 0.2s;
  border: none;

  &:hover {
    background: ${(props) =>
      props.$darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"};
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

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CommentContent = styled.div`
  flex: 1;
`;

const CommentUsername = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const CaptionText = styled.div`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  line-height: 18px;
  word-break: break-word;
`;

const CommentText = styled.div`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  line-height: 18px;
  word-break: break-word;
`;

const CommentTime = styled.div`
  font-size: 12px;
  color: ${(props) => (props.$darkMode ? "#a8a8a8" : "#8e8e8e")};
  margin-top: 8px;
`;

const ModalActions = styled.div`
  border-top: 1px solid ${(props) => (props.$darkMode ? "#363636" : "#efefef")};
  padding: 8px 16px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
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

  svg {
    color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  }
`;

const Likes = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  margin: 8px 0;
`;

const Timestamp = styled.div`
  font-size: 10px;
  color: ${(props) => (props.$darkMode ? "#a8a8a8" : "#8e8e8e")};
  letter-spacing: 0.2px;
  text-transform: uppercase;
`;

const CommentInputBox = styled.div`
  border-top: 1px solid ${(props) => (props.$darkMode ? "#363636" : "#efefef")};
  padding: 6px 16px;
  display: flex;
  align-items: center;
  min-height: 56px;

  input {
    flex: 1;
    font-size: 14px;
    background: transparent;
    color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
    border: none;
    outline: none;

    &::placeholder {
      color: ${(props) => (props.$darkMode ? "#a8a8a8" : "#8e8e8e")};
    }
  }
`;

const PostButton = styled.button`
  color: #0095f6;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s;
  background: transparent;
  border: none;

  &:hover {
    color: #00376b;
  }

  &:active {
    opacity: 0.5;
  }
`;

export default Explore;
