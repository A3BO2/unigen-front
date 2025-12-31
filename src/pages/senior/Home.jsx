import { useState, useEffect, useRef, Fragment } from "react";
import styled, { ThemeProvider } from "styled-components";
import { Heart, MessageCircle, MoreHorizontal, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import SeniorBottomNav from "../../components/senior/BottomNav";
import { getSeniorPosts } from "../../services/post";
import {
  getCommentsByPostId,
  addCommentToPost,
  likePost,
  unlikePost,
} from "../../services/senior";
import { isFollowing, followUser, unfollowUser } from "../../services/user";
import { deleteComment } from "../../services/comment";
import { deletePost } from "../../services/post";

const getFullUrl = (url) => {
  if (!url) return null;
  return url;
};

const Home = () => {
  console.log("🔥🔥🔥 시니어 Home 컴포넌트 로드됨 🔥🔥🔥");
  const { isDarkMode, user } = useApp();
  const [posts, setPosts] = useState([]);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [submittingComment, setSubmittingComment] = useState({});
  const [followStatus, setFollowStatus] = useState({});
  const [followLoading, setFollowLoading] = useState({});

  // 해시태그 색상 처리 함수
  const renderContentWithHashtags = (content) => {
    console.log("🔥 renderContentWithHashtags 호출됨:", content);
    if (!content) return content;

    const parts = content.split(/(#[가-힣a-zA-Z0-9_]+)/g);
    console.log("🔥 split 결과:", parts);

    if (parts.length === 1) return content;

    const result = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part && part.startsWith("#") && part.length > 1) {
        console.log("🔥 해시태그 발견:", part);
        result.push(
          <Hashtag key={`hashtag-${i}`} $darkMode={isDarkMode}>
            {part}
          </Hashtag>
        );
      } else if (part) {
        result.push(<span key={`text-${i}`}>{part}</span>);
      }
    }
    console.log("🔥 최종 result:", result);
    return result;
  };
  const [activateMenuPostId, setActivateMenuPostId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasFollowData, setHasFollowData] = useState(true);
  const [isAllMode, setIsAllMode] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [followPage, setFollowPage] = useState(0);
  const [allPage, setAllPage] = useState(0);
  const isModeTransitioning = useRef(false);
  const loadedPostIds = useRef(new Set());
  const [showEmptyTransition, setShowEmptyTransition] = useState(false);
  const POSTS_PER_PAGE = 5;

  const formatPosts = (data, mode) => {
    return data.map((post) => {
      const userId =
        post.user?.authorId ||
        post.author?.id ||
        post.authorId ||
        post.user?.id;

      return {
        ...post,
        mode: mode,
        // 🔥 [수정] 프론트에서 계산하지 않고, 서버가 준 값 그대로 사용!
        timestamp: post.timestamp,

        photo: getFullUrl(post.photo),
        user: {
          ...post.user,
          id: userId,
          name: post.user?.name || post.user?.username,
          username: post.user?.username,
          avatar: getFullUrl(post.user?.avatar),
        },
        comments: (post.comments || []).map((comment) => ({
          ...comment,
          user: {
            ...comment.user,
            name: comment.user?.name || comment.user?.username,
            avatar: getFullUrl(comment.user?.avatar),
          },
          // 🔥 [수정] 댓글 시간도 서버가 준 값 그대로 사용!
          time: comment.time,
        })),
      };
    });
  };

  const checkFollowStatus = async (userId) => {
    if (!userId || userId === "undefined" || followStatus[userId]) return;

    try {
      const result = await isFollowing(userId);
      setFollowStatus((prev) => ({
        ...prev,
        [userId]: {
          isFollowing: result.isFollowing,
          isMine: result.isMine,
        },
      }));
    } catch (err) {
      console.error("팔로우 상태 확인 실패:", err);
    }
  };

  const handleFollow = async (userId) => {
    if (!userId || followLoading[userId]) return;

    const currentStatus = followStatus[userId];
    const isCurrentlyFollowing = currentStatus?.isFollowing;
    setFollowStatus((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        isFollowing: !isCurrentlyFollowing,
      },
    }));
    setFollowLoading((prev) => ({ ...prev, [userId]: true }));

    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
    } catch (err) {
      console.error("팔로우 처리 실패:", err);
      // 실패 시 롤백
      setFollowStatus((prev) => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          isFollowing: isCurrentlyFollowing,
        },
      }));
      alert(
        isCurrentlyFollowing
          ? "언팔로우에 실패했습니다."
          : "팔로우에 실패했습니다."
      );
    } finally {
      setFollowLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const loadPosts = async (loadMore = false) => {
    if ((loadMore && isLoadingMore) || (loadMore && !hasMore)) return;
    if (isModeTransitioning.current) return;

    try {
      if (loadMore) {
        setIsLoadingMore(true);
      } else if (!loading) {
        // 이미 loading이 true인 경우(전환 중)에는 다시 설정하지 않음
        setLoading(true);
      }

      const currentPage = isAllMode ? allPage + 1 : followPage + 1;
      const all = isAllMode;

      const data = await getSeniorPosts(null, currentPage, POSTS_PER_PAGE, all);

      if (data && data.length > 0) {
        const formattedPosts = formatPosts(data, isAllMode ? "all" : "follow");

        const newPosts = formattedPosts.filter(
          (post) => !loadedPostIds.current.has(post.id)
        );

        if (newPosts.length > 0) {
          newPosts.forEach((post) => loadedPostIds.current.add(post.id));

          const uniqueUserIds = [
            ...new Set(newPosts.map((post) => post.user.id).filter(Boolean)),
          ];
          uniqueUserIds.forEach((userId) => checkFollowStatus(userId));

          if (loadMore) {
            // 기존 posts와 중복 제거 후 추가 (중복 key 오류 방지)
            setPosts((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const uniqueNewPosts = newPosts.filter(
                (p) => !existingIds.has(p.id)
              );
              return [...prev, ...uniqueNewPosts];
            });
          } else {
            setPosts(newPosts);
          }

          if (isAllMode) {
            setAllPage((prev) => prev + 1);
          } else {
            setFollowPage((prev) => prev + 1);
          }

          if (data.length < POSTS_PER_PAGE) {
            if (!isAllMode && hasFollowData) {
              isModeTransitioning.current = true;
              setHasFollowData(false);
              setIsAllMode(true);
              setHasMore(true);
            } else {
              setHasMore(false);
            }
          }

          setError(null);
        } else if (loadMore) {
          // 중복 데이터만 있는 경우 - 팔로우 모드에서는 전체 모드로 전환
          if (!isAllMode && hasFollowData) {
            isModeTransitioning.current = true;
            setHasFollowData(false);
            setIsAllMode(true);
            setHasMore(true);
          } else {
            // 전체 모드에서 중복만 있으면 페이지 증가 후 계속 시도
            if (isAllMode) {
              setAllPage((prev) => prev + 1);
            } else {
              setFollowPage((prev) => prev + 1);
            }
            if (data.length < POSTS_PER_PAGE) {
              setHasMore(false);
            }
          }
          return;
        }
      } else {
        // 데이터가 비어있는 경우
        if (!isAllMode && hasFollowData) {
          // 팔로우 모드에서 데이터가 없으면 즉시 전체 모드로 전환
          isModeTransitioning.current = true;
          setHasFollowData(false);
          setIsAllMode(true);
          setHasMore(true);
          setAllPage(0); // 전체 모드 페이지 초기화
          loadedPostIds.current.clear(); // 로드된 게시글 ID 초기화
          setPosts([]); // 게시물 배열 초기화 (중복 방지)
          setShowEmptyTransition(true); // 빈 상태 전환 메시지 표시
          isModeTransitioning.current = false;
          // loading 상태를 false로 설정하지 않고 바로 로드 (useEffect에서 처리되도록 상태만 변경)
          // finally에서 loading이 false로 설정되므로 useEffect에서 처리
          return; // finally 블록 실행 후 useEffect에서 처리
        } else {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error("게시물을 불러오는데 실패했습니다:", err);
      setError(err.message);
      if (!loadMore) {
        setPosts([]);
      }
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAllMode && !hasFollowData && hasMore && isModeTransitioning.current) {
      isModeTransitioning.current = false;
      loadPosts(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllMode, hasFollowData, hasMore]);

  // 팔로우 모드에서 전체 모드로 전환하는 경우 (데이터가 비어있을 때)
  useEffect(() => {
    if (
      isAllMode &&
      !hasFollowData &&
      hasMore &&
      showEmptyTransition &&
      posts.length === 0 &&
      !loading &&
      !isLoadingMore
    ) {
      // 전체 모드 게시물 로드
      loadPosts(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAllMode,
    hasFollowData,
    hasMore,
    showEmptyTransition,
    posts.length,
    loading,
    isLoadingMore,
  ]);

  useEffect(() => {
    const handleScroll = () => {
      if (isLoadingMore || loading || !hasMore) return;

      const scrollTop =
        document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight =
        document.documentElement.scrollHeight || document.body.scrollHeight;
      const clientHeight =
        document.documentElement.clientHeight || window.innerHeight;

      if (scrollTop + clientHeight >= scrollHeight - 200) {
        loadPosts(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isLoadingMore, loading, hasMore]);

  const handleLike = async (postId) => {
    const currentPost = posts.find((post) => post.id === postId);
    if (!currentPost) return;

    const isCurrentlyLiked = currentPost.liked;

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

    try {
      if (isCurrentlyLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    } catch (err) {
      console.error("좋아요 처리에 실패했습니다:", err);
      setPosts(
        posts.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              liked: isCurrentlyLiked,
              likes: isCurrentlyLiked ? currentPost.likes : currentPost.likes,
            };
          }
          return post;
        })
      );
    }
  };

  const toggleComments = async (postId) => {
    const isCurrentlyExpanded = expandedComments[postId];

    // 댓글 섹션 토글
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));

    // 댓글을 열 때만 서버에서 불러오기
    if (!isCurrentlyExpanded) {
      setLoadingComments((prev) => ({ ...prev, [postId]: true }));
      try {
        const response = await getCommentsByPostId(postId);
        if (response.success && response.data) {
          // API 응답을 컴포넌트 형식으로 변환
          const formattedComments = response.data.map((comment) => ({
            id: comment.commentId,
            user: {
              id: comment.authorId,
              name: comment.authorName,
              avatar: comment.authorProfileImage,
            },
            text: comment.content,
            time: comment.time,
          }));

          // 해당 포스트의 댓글 업데이트
          setPosts((prevPosts) =>
            prevPosts.map((post) =>
              post.id === postId
                ? { ...post, comments: formattedComments }
                : post
            )
          );
        }
      } catch (err) {
        console.error("댓글을 불러오는데 실패했습니다:", err);
      } finally {
        setLoadingComments((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!confirm("정말로 댓글을 삭제하시겠습니까?")) return;

    try {
      await deleteComment(commentId);

      // 댓글 목록 새로고침
      const response = await getCommentsByPostId(postId);
      if (response.success && response.data) {
        const formattedComments = response.data.map((comment) => ({
          id: comment.commentId,
          user: {
            id: comment.authorId,
            name: comment.authorName,
            avatar: comment.authorProfileImage,
          },
          text: comment.content,
          time: comment.time,
        }));

        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId ? { ...post, comments: formattedComments } : post
          )
        );
      }
    } catch (err) {
      console.error("댓글 삭제에 실패했습니다:", err);
      alert("댓글 삭제에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm("정말로 게시물을 삭제하시겠습니까?")) return;

    try {
      await deletePost(postId);
      alert("삭제되었습니다.");

      setPosts((prev) => prev.filter((post) => post.id !== postId));
      setActivateMenuPostId(null);
    } catch (error) {
      console.error(error);
      alert(error.message || "삭제 실패");
    }
  };

  const toggleMenu = (postId) => {
    if (activateMenuPostId === postId) {
      setActivateMenuPostId(null);
    } else {
      setActivateMenuPostId(postId);
    }
  };

  const handleCommentChange = (postId, value) => {
    setCommentInputs((prev) => ({
      ...prev,
      [postId]: value,
    }));
  };

  const handleCommentSubmit = async (postId) => {
    const commentText = commentInputs[postId];
    if (!commentText || !commentText.trim()) {
      return;
    }

    if (submittingComment[postId]) return;

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));

    try {
      const response = await addCommentToPost(postId, commentText.trim());

      if (response.success) {
        const commentsResponse = await getCommentsByPostId(postId);
        if (commentsResponse.success && commentsResponse.data) {
          const formattedComments = commentsResponse.data.map((comment) => ({
            id: comment.commentId,
            user: {
              id: comment.authorId,
              name: comment.authorName,
              avatar: comment.authorProfileImage,
            },
            text: comment.content,
            time: comment.time,
          }));

          setPosts((prevPosts) =>
            prevPosts.map((post) =>
              post.id === postId
                ? { ...post, comments: formattedComments }
                : post
            )
          );
        }

        setCommentInputs((prev) => ({
          ...prev,
          [postId]: "",
        }));
      }
    } catch (err) {
      console.error("댓글 작성에 실패했습니다:", err);
      alert("댓글 작성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  return (
    <ThemeProvider theme={{ $darkMode: isDarkMode }}>
      <Container>
        <Header>
          <Logo>친구소식</Logo>
        </Header>

        {loading && (
          <LoadingContainer>
            <LoadingText>게시물을 불러오는 중...</LoadingText>
          </LoadingContainer>
        )}

        {error && (
          <ErrorContainer>
            <ErrorText>게시물을 불러오지 못했습니다</ErrorText>
            <ErrorSubText>{error}</ErrorSubText>
          </ErrorContainer>
        )}

        <Feed>
          {/* 팔로우 모드에서 게시글이 없어서 전체 모드로 전환된 경우 */}
          {showEmptyTransition && !loading && !isLoadingMore && (
            <InfoContainer>
              <InfoText>팔로우한 친구들의 게시물을 모두 확인했어요</InfoText>
              <InfoSubText>이제 모든 게시물을 보여드릴게요</InfoSubText>
            </InfoContainer>
          )}

          {posts.map((post, index) => {
            const showModeTransition =
              index > 0 &&
              posts[index - 1].mode === "follow" &&
              post.mode === "all";

            return (
              <div key={post.id}>
                {showModeTransition && !showEmptyTransition && (
                  <InfoContainer>
                    <InfoText>
                      팔로우한 친구들의 게시물을 모두 확인했어요
                    </InfoText>
                    <InfoSubText>이제 모든 게시물을 보여드릴게요</InfoSubText>
                  </InfoContainer>
                )}
                <Post>
                  <PostHeader>
                    <UserInfo>
                      <Avatar>
                        {post.user.avatar &&
                        (post.user.avatar.startsWith("http") ||
                          post.user.avatar.startsWith("/")) ? (
                          <AvatarImage
                            src={post.user.avatar}
                            alt={
                              post.user.name || post.user.username || "사용자"
                            }
                          />
                        ) : (
                          post.user.avatar || "👤"
                        )}
                      </Avatar>
                      <UserDetails>
                        <Username>
                          {post.user.name || post.user.username || "사용자"}
                        </Username>
                        <Timestamp>{post.timestamp}</Timestamp>
                      </UserDetails>
                    </UserInfo>
                    {user?.id === post.user?.id ? (
                      <div style={{ position: "relative" }}>
                        <MoreButton
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMenu(post.id);
                          }}
                        >
                          <MoreHorizontal size={28} />
                        </MoreButton>
                        {activateMenuPostId === post.id && (
                          <>
                            <MenuOverlay
                              onClick={() => setActivateMenuPostId(null)}
                            />
                            <DropdownMenu>
                              <MenuItem
                                onClick={() => handleDeletePost(post.id)}
                              >
                                삭제
                              </MenuItem>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    ) : (
                      post.user?.id &&
                      followStatus[post.user.id]?.isMine !== true && (
                        <FollowButton
                          onClick={() => handleFollow(post.user.id)}
                          $isFollowing={followStatus[post.user.id]?.isFollowing}
                          $isLoading={
                            followLoading[post.user.id] ||
                            !followStatus[post.user.id]
                          }
                          disabled={
                            followLoading[post.user.id] ||
                            !followStatus[post.user.id]
                          }
                        >
                          {followLoading[post.user.id]
                            ? "처리중..."
                            : !followStatus[post.user.id]
                            ? "확인중..."
                            : followStatus[post.user.id]?.isFollowing
                            ? "팔로잉"
                            : "팔로우"}
                        </FollowButton>
                      )
                    )}
                  </PostHeader>

                  <Content $darkMode={isDarkMode}>
                    {renderContentWithHashtags(post.content)}
                  </Content>

                  {post.photo && (
                    <PostImage src={post.photo} alt="게시물 사진" />
                  )}

                  <PostActions>
                    <ActionButton
                      onClick={() => handleLike(post.id)}
                      $liked={post.liked}
                    >
                      <Heart
                        size={36}
                        strokeWidth={3}
                        fill={post.liked ? "#ff4458" : "none"}
                      />
                      <ActionText $liked={post.liked}>{post.likes}</ActionText>
                    </ActionButton>
                    <ActionButton onClick={() => toggleComments(post.id)}>
                      <MessageCircle size={36} strokeWidth={3} />
                      <ActionText>{post.comments.length}</ActionText>
                    </ActionButton>
                  </PostActions>

                  {expandedComments[post.id] && (
                    <CommentsSection>
                      <CommentsHeader>
                        댓글 {post.comments.length}개
                      </CommentsHeader>

                      <CommentInputSection>
                        <CommentInputWrapper>
                          <CommentInput
                            placeholder="댓글을 입력하세요..."
                            value={commentInputs[post.id] || ""}
                            onChange={(e) =>
                              handleCommentChange(post.id, e.target.value)
                            }
                            onKeyPress={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleCommentSubmit(post.id);
                              }
                            }}
                            disabled={submittingComment[post.id]}
                          />
                          <CommentSubmitButton
                            onClick={() => handleCommentSubmit(post.id)}
                            disabled={submittingComment[post.id]}
                            $isSubmitting={submittingComment[post.id]}
                          >
                            {submittingComment[post.id] ? "등록중..." : "등록"}
                          </CommentSubmitButton>
                        </CommentInputWrapper>
                      </CommentInputSection>

                      {loadingComments[post.id] ? (
                        <CommentLoadingText>
                          댓글을 불러오는 중...
                        </CommentLoadingText>
                      ) : (
                        <CommentsList>
                          {post.comments.map((comment) => (
                            <CommentItem key={comment.id}>
                              <CommentAvatar>
                                {comment.user.avatar &&
                                (comment.user.avatar.startsWith("http") ||
                                  comment.user.avatar.startsWith("/")) ? (
                                  <AvatarImage
                                    src={comment.user.avatar}
                                    alt={
                                      comment.user.name ||
                                      comment.user.username ||
                                      "사용자"
                                    }
                                  />
                                ) : (
                                  comment.user.avatar || "👤"
                                )}
                              </CommentAvatar>
                              <CommentContent>
                                <CommentHeader>
                                  <CommentUsername>
                                    {comment.user.name ||
                                      comment.user.username ||
                                      "사용자"}
                                  </CommentUsername>
                                  <CommentTime>{comment.time}</CommentTime>
                                </CommentHeader>
                                <CommentText>{comment.text}</CommentText>
                              </CommentContent>
                              {user?.id === comment.user?.id && (
                                <CommentDeleteButton
                                  onClick={() =>
                                    handleDeleteComment(post.id, comment.id)
                                  }
                                >
                                  <X size={18} />
                                </CommentDeleteButton>
                              )}
                            </CommentItem>
                          ))}
                        </CommentsList>
                      )}
                    </CommentsSection>
                  )}
                </Post>
              </div>
            );
          })}
        </Feed>

        {isLoadingMore && (
          <LoadingMoreContainer>
            <LoadingText>더 많은 게시물을 불러오는 중...</LoadingText>
          </LoadingMoreContainer>
        )}

        {!hasMore && posts.length > 0 && !loading && (
          <EndMessage>모든 게시물을 확인했습니다 🎉</EndMessage>
        )}

        <SeniorBottomNav />
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
  z-index: 10;
`;

const Logo = styled.h1`
  font-size: calc(32px * var(--font-scale, 1));
  font-weight: 700;
`;

const Feed = styled.div`
  max-width: 100%;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 24px;
`;

const LoadingText = styled.p`
  font-size: calc(22px * var(--font-scale, 1));
  color: ${(props) => (props.theme.$darkMode ? "#999" : "#666")};
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 24px;
  background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#fff3cd")};
  border: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#ffc107")};
  border-radius: 12px;
  margin: 20px 24px;
`;

const ErrorText = styled.p`
  font-size: calc(22px * var(--font-scale, 1));
  font-weight: 700;
  color: ${(props) => (props.theme.$darkMode ? "#ffc107" : "#856404")};
`;

const ErrorSubText = styled.p`
  font-size: calc(18px * var(--font-scale, 1));
  color: ${(props) => (props.theme.$darkMode ? "#999" : "#666")};
`;

const InfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 24px;
  background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#e3f2fd")};
  border: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#2196f3")};
  border-radius: 12px;
  margin: 20px 24px;
`;

const InfoText = styled.p`
  font-size: calc(22px * var(--font-scale, 1));
  font-weight: 700;
  color: ${(props) => (props.theme.$darkMode ? "#2196f3" : "#1976d2")};
`;

const InfoSubText = styled.p`
  font-size: calc(18px * var(--font-scale, 1));
  color: ${(props) => (props.theme.$darkMode ? "#999" : "#666")};
`;

const LoadingMoreContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 24px;
`;

const EndMessage = styled.div`
  text-align: center;
  padding: 40px 20px;
  font-size: calc(20px * var(--font-scale, 1));
  color: ${(props) => (props.theme.$darkMode ? "#999" : "#666")};
  font-weight: 500;
`;

const Post = styled.article`
  border-bottom: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  padding: 28px;
  transition: background 0.2s;

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
  flex: 1;
  min-width: 0;
`;

const Avatar = styled.div`
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

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
`;

const Username = styled.span`
  font-size: calc(24px * var(--font-scale, 1));
  font-weight: 700;
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Timestamp = styled.span`
  font-size: calc(15px * var(--font-scale, 1));
  color: ${(props) => (props.theme.$darkMode ? "#999" : "#666")};
  margin-top: 2px;
`;

const FollowButton = styled.button`
  padding: 12px 24px;
  border-radius: 10px;
  font-size: calc(18px * var(--font-scale, 1));
  font-weight: 700;
  min-width: 100px;
  flex-shrink: 0;
  transition: all 0.2s;
  cursor: ${(props) => (props.$isLoading ? "not-allowed" : "pointer")};
  opacity: ${(props) => (props.$isLoading ? 0.7 : 1)};

  background: ${(props) => {
    if (props.$isLoading) return props.theme.$darkMode ? "#333" : "#ccc";
    if (props.$isFollowing) return props.theme.$darkMode ? "#333" : "#e0e0e0";
    return "#0095f6";
  }};

  color: ${(props) => {
    if (props.$isFollowing) return props.theme.$darkMode ? "#fff" : "#000";
    return "#fff";
  }};

  border: 2px solid
    ${(props) => {
      if (props.$isLoading) return props.theme.$darkMode ? "#333" : "#ccc";
      if (props.$isFollowing) return props.theme.$darkMode ? "#444" : "#ccc";
      return "#0095f6";
    }};

  &:active {
    transform: ${(props) => (props.$isLoading ? "none" : "scale(0.95)")};
  }

  &:hover:not(:disabled) {
    background: ${(props) => {
      if (props.$isFollowing)
        return props.theme.$darkMode ? "#ff4458" : "#ffebee";
      return "#1877f2";
    }};
    border-color: ${(props) => {
      if (props.$isFollowing) return "#ff4458";
      return "#1877f2";
    }};
    color: ${(props) => (props.$isFollowing ? "#ff4458" : "#fff")};
  }
`;

const Content = styled.p`
  font-size: calc(24px * var(--font-scale, 1));
  line-height: 1.7;
  margin-bottom: 24px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#000")};
  word-break: keep-all;
  white-space: pre-wrap;
`;

const Hashtag = styled.span`
  color: ${(props) => (props.$darkMode ? "#4A9EFF" : "#0095f6")};
  font-weight: 600;
`;

const PostImage = styled.img`
  width: 100%;
  border-radius: 16px;
  margin-bottom: 24px;
  object-fit: cover;
  max-height: 500px;
`;

const PostActions = styled.div`
  display: flex;
  gap: 20px;
  margin-top: 20px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 16px;
  color: ${(props) =>
    props.$liked ? "#ff4458" : props.theme.$darkMode ? "#999" : "#666"};
  padding: 16px 20px;
  border-radius: 12px;
  min-height: 56px;
  transition: all 0.2s;

  &:active {
    background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#f5f5f5")};
    transform: scale(0.95);
  }

  svg {
    transition: all 0.3s;
  }

  &:active svg {
    transform: scale(1.2);
  }
`;

const ActionText = styled.span`
  font-size: calc(22px * var(--font-scale, 1));
  font-weight: 700;
  color: ${(props) =>
    props.$liked ? "#ff4458" : props.theme.$darkMode ? "#fff" : "#000"};
  min-width: 36px;
`;

const CommentsSection = styled.div`
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
`;

const CommentsHeader = styled.h3`
  font-size: calc(22px * var(--font-scale, 1));
  font-weight: 700;
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  margin-bottom: 20px;
`;

const CommentInputSection = styled.div`
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
`;

const CommentInputWrapper = styled.div`
  display: flex;
  gap: 12px;
  align-items: stretch;
`;

const CommentInput = styled.textarea`
  flex: 1;
  background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#f5f5f5")};
  border: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  border-radius: 12px;
  padding: 16px;
  font-size: calc(20px * var(--font-scale, 1));
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  resize: none;
  min-height: 80px;
  line-height: 1.5;

  &::placeholder {
    color: ${(props) => (props.theme.$darkMode ? "#6a6a6a" : "#999")};
  }

  &:focus {
    border-color: #0095f6;
    outline: none;
  }
`;

const CommentSubmitButton = styled.button`
  background: ${(props) => (props.$isSubmitting ? "#666" : "#0095f6")};
  color: #fff;
  font-size: calc(20px * var(--font-scale, 1));
  font-weight: 700;
  padding: 16px 28px;
  border-radius: 12px;
  min-height: 80px;
  border: 2px solid ${(props) => (props.$isSubmitting ? "#666" : "#0095f6")};
  transition: all 0.2s;
  cursor: ${(props) => (props.$isSubmitting ? "not-allowed" : "pointer")};
  opacity: ${(props) => (props.$isSubmitting ? 0.7 : 1)};

  &:active {
    transform: ${(props) => (props.$isSubmitting ? "none" : "scale(0.95)")};
    background: ${(props) => (props.$isSubmitting ? "#666" : "#1877f2")};
    border-color: ${(props) => (props.$isSubmitting ? "#666" : "#1877f2")};
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

const CommentLoadingText = styled.p`
  text-align: center;
  padding: 24px;
  font-size: calc(18px * var(--font-scale, 1));
  color: ${(props) => (props.theme.$darkMode ? "#999" : "#666")};
`;

const CommentsList = styled.div`
  display: flex;
  flex-direction: column;
`;

const CommentItem = styled.div`
  display: flex;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#f0f0f0")};

  &:last-child {
    border-bottom: none;
  }
`;

const CommentAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#f5f5f5")};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(28px * var(--font-scale, 1));
  flex-shrink: 0;
  border: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  overflow: hidden;
`;

const CommentContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CommentUsername = styled.span`
  font-size: calc(20px * var(--font-scale, 1));
  font-weight: 700;
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
`;

const CommentTime = styled.span`
  font-size: calc(14px * var(--font-scale, 1));
  color: ${(props) => (props.theme.$darkMode ? "#999" : "#666")};
`;

const CommentText = styled.p`
  font-size: calc(20px * var(--font-scale, 1));
  line-height: 1.6;
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  word-break: keep-all;
  white-space: pre-wrap;
`;

const CommentDeleteButton = styled.button`
  padding: 8px;
  cursor: pointer;
  background: transparent;
  border: none;
  color: ${(props) => (props.theme.$darkMode ? "#999" : "#666")};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  opacity: 0.7;

  &:hover {
    opacity: 1;
    color: #ff4458;
  }

  &:active {
    transform: scale(0.9);
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
    color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
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
  background: ${(props) => (props.theme.$darkMode ? "#262626" : "white")};
  border: 1px solid ${(props) => (props.theme.$darkMode ? "#555" : "#dbdbdb")};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 120px;
  z-index: 20;
  overflow: hidden;
`;

const MenuItem = styled.button`
  width: 100%;
  padding: 16px;
  text-align: center;
  font-size: calc(18px * var(--font-scale, 1));
  background: transparent;
  border: none;
  cursor: pointer;
  border-bottom: 1px solid
    ${(props) => (props.theme.$darkMode ? "#333" : "#f0f0f0")};
  color: ${(props) =>
    props.$danger ? "#ff4458" : props.theme.$darkMode ? "#fff" : "#000"};
  font-weight: ${(props) => (props.$danger ? "700" : "500")};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${(props) => (props.theme.$darkMode ? "#333" : "#fafafa")};
  }

  &:active {
    background: ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#f5f5f5")};
  }
`;

export default Home;
