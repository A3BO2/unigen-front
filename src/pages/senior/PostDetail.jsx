import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled, { ThemeProvider } from "styled-components";
import { Heart, MessageCircle, ArrowLeft } from "lucide-react";
import { useApp } from "../../context/AppContext";
import SeniorBottomNav from "../../components/senior/BottomNav";
import {
  getPostById,
  likePost,
  unlikePost,
  createComment,
} from "../../services/post";

const baseURL = import.meta.env.VITE_BASE_URL;
if (!baseURL) {
  throw new Error("VITE_BASE_URL 환경변수가 설정되지 않았습니다.");
}

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${baseURL}${url}`;
};

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useApp();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedComments, setExpandedComments] = useState(true);
  const [commentInput, setCommentInput] = useState("");
  const [isLiking, setIsLiking] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    const loadPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPostById(id);
        setPost(data);
      } catch (err) {
        console.error("게시물 로드 실패:", err);
        setError(err.message || "게시물을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadPost();
    }
  }, [id]);

  const handleLike = async () => {
    if (!post || isLiking) return;

    const wasLiked = post.liked;
    const previousLikes = post.likes;

    // 낙관적 업데이트
    setPost({
      ...post,
      liked: !wasLiked,
      likes: wasLiked ? previousLikes - 1 : previousLikes + 1,
    });
    setIsLiking(true);

    try {
      if (wasLiked) {
        await unlikePost(post.id);
      } else {
        await likePost(post.id);
      }
      // 성공 시 게시물 다시 로드하여 최신 상태 반영
      const updatedPost = await getPostById(id);
      setPost(updatedPost);
    } catch (err) {
      console.error("좋아요 처리 실패:", err);
      // 실패 시 원래 상태로 복구
      setPost({
        ...post,
        liked: wasLiked,
        likes: previousLikes,
      });
      alert("좋아요 처리에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentInput.trim() || !post || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const commentText = commentInput.trim();

    try {
      // 댓글 생성 API 호출
      await createComment(post.id, commentText);

      // 성공 시 게시물 다시 로드하여 최신 댓글 반영
      const updatedPost = await getPostById(id);
      setPost(updatedPost);
      setCommentInput("");
    } catch (err) {
      console.error("댓글 작성 실패:", err);
      alert("댓글 작성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <ThemeProvider theme={{ $darkMode: isDarkMode }}>
        <Container>
          <LoadingContainer>
            <LoadingText>게시물을 불러오는 중...</LoadingText>
          </LoadingContainer>
        </Container>
      </ThemeProvider>
    );
  }

  if (error || !post) {
    return (
      <ThemeProvider theme={{ $darkMode: isDarkMode }}>
        <Container>
          <ErrorContainer>
            <ErrorText>{error || "게시물을 찾을 수 없습니다."}</ErrorText>
            <BackButton onClick={() => navigate("/senior/profile")}>
              프로필로 돌아가기
            </BackButton>
          </ErrorContainer>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={{ $darkMode: isDarkMode }}>
      <Container>
        <Header>
          <BackButton onClick={() => navigate("/senior/profile")}>
            <ArrowLeft size={28} />
          </BackButton>
          <Title>게시물</Title>
          <div style={{ width: 28 }} />
        </Header>

        <Post>
          <PostHeader>
            <UserInfo>
              <Avatar>
                {post.user.avatar &&
                (post.user.avatar.startsWith("http") ||
                  post.user.avatar.startsWith("/")) ? (
                  <AvatarImage
                    src={getImageUrl(post.user.avatar)}
                    alt={post.user.name || post.user.username || "사용자"}
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
          </PostHeader>

          <Content>{post.content}</Content>

          {post.photo && (
            <PostImage src={getImageUrl(post.photo)} alt="게시물 사진" />
          )}

          <PostActions>
            <ActionButton
              onClick={handleLike}
              $liked={post.liked}
              disabled={isLiking}
            >
              <Heart
                size={36}
                strokeWidth={3}
                fill={post.liked ? "#ff4458" : "none"}
              />
              <ActionText $liked={post.liked}>{post.likes}</ActionText>
            </ActionButton>
            <ActionButton
              onClick={() => setExpandedComments(!expandedComments)}
            >
              <MessageCircle size={36} strokeWidth={3} />
              <ActionText>{post.comments.length}</ActionText>
            </ActionButton>
          </PostActions>

          {expandedComments && (
            <CommentsSection>
              <CommentsHeader>댓글 {post.comments.length}개</CommentsHeader>

              <CommentInputSection>
                <CommentInputWrapper>
                  <CommentInput
                    placeholder="댓글을 입력하세요..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCommentSubmit();
                      }
                    }}
                  />
                  <CommentSubmitButton
                    onClick={handleCommentSubmit}
                    disabled={isSubmittingComment || !commentInput.trim()}
                    $isSubmitting={isSubmittingComment}
                  >
                    {isSubmittingComment ? "등록중..." : "등록"}
                  </CommentSubmitButton>
                </CommentInputWrapper>
              </CommentInputSection>

              <CommentsList>
                {post.comments.map((comment) => (
                  <CommentItem key={comment.id}>
                    <CommentAvatar>
                      {comment.user.avatar &&
                      (comment.user.avatar.startsWith("http") ||
                        comment.user.avatar.startsWith("/")) ? (
                        <AvatarImage
                          src={getImageUrl(comment.user.avatar)}
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
                  </CommentItem>
                ))}
              </CommentsList>
            </CommentsSection>
          )}
        </Post>

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
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
`;

const Title = styled.h1`
  font-size: calc(32px * var(--font-scale, 1));
  font-weight: 700;
`;

const BackButton = styled.button`
  background: transparent;
  border: none;
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    opacity: 0.7;
  }
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
  gap: 20px;
  padding: 60px 24px;
`;

const ErrorText = styled.p`
  font-size: calc(22px * var(--font-scale, 1));
  color: ${(props) => (props.theme.$darkMode ? "#ff6b6b" : "#e74c3c")};
  text-align: center;
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

const Content = styled.p`
  font-size: calc(24px * var(--font-scale, 1));
  line-height: 1.7;
  margin-bottom: 24px;
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  word-break: keep-all;
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
`;

export default PostDetail;
