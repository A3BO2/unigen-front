import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { ArrowLeft, Heart, MessageCircle, Send, MoreHorizontal } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { getPostById } from "../../services/post";
import LeftSidebar from "../../components/normal/LeftSidebar";
import RightSidebar from "../../components/normal/RightSidebar";
import BottomNav from "../../components/normal/BottomNav";

const baseURL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

const getImageUrl = (url) => {
  if (!url) {
    console.warn("PostDetail getImageUrl: url이 없습니다");
    return null;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // URL이 /로 시작하지 않으면 / 추가
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  const fullUrl = `${baseURL}${cleanUrl}`;
  return fullUrl;
};

const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user, isDarkMode } = useApp();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    const loadPost = async () => {
      if (!postId) {
        setError("게시물 ID가 없습니다.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getPostById(postId);
        
        if (!data) {
          throw new Error("게시물 데이터를 받지 못했습니다.");
        }
        
        setPost(data);
        setIsLiked(data.is_liked || false);
      } catch (err) {
        console.error("게시물 로드 실패:", err);
        const errorMessage = err.message || "게시물을 불러오는데 실패했습니다.";
        setError(errorMessage);
        console.error("에러 상세:", {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [postId]);

  const handleLike = async () => {
    // TODO: 좋아요 API 호출
    setIsLiked(!isLiked);
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;
    // TODO: 댓글 작성 API 호출
    setCommentText("");
  };

  if (loading) {
    return (
      <>
        <LeftSidebar />
        <RightSidebar />
        <BottomNav />
        <Container $darkMode={isDarkMode}>
          <LoadingMessage $darkMode={isDarkMode}>불러오는 중...</LoadingMessage>
        </Container>
      </>
    );
  }

  if (error) {
    return (
      <>
        <LeftSidebar />
        <RightSidebar />
        <BottomNav />
        <Container $darkMode={isDarkMode}>
          <ErrorMessage $darkMode={isDarkMode}>
            {error}
            <br />
            <small style={{ fontSize: "12px", marginTop: "8px", display: "block", opacity: 0.7 }}>
              서버가 실행 중인지 확인해주세요.
            </small>
          </ErrorMessage>
        </Container>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <LeftSidebar />
        <RightSidebar />
        <BottomNav />
        <Container $darkMode={isDarkMode}>
          <ErrorMessage $darkMode={isDarkMode}>
            게시물을 찾을 수 없습니다.
          </ErrorMessage>
        </Container>
      </>
    );
  }

  return (
    <>
      <LeftSidebar />
      <RightSidebar />
      <BottomNav />
      <Container $darkMode={isDarkMode}>
        <Header $darkMode={isDarkMode}>
          <BackButton onClick={() => navigate(-1)} $darkMode={isDarkMode}>
            <ArrowLeft size={24} />
          </BackButton>
          <HeaderTitle $darkMode={isDarkMode}>게시물</HeaderTitle>
          <MoreButton $darkMode={isDarkMode}>
            <MoreHorizontal size={24} />
          </MoreButton>
        </Header>

        <PostContent $darkMode={isDarkMode}>
          <PostImageSection>
            {post.image_url ? (
              <PostImage
                src={getImageUrl(post.image_url)}
                alt="게시물 이미지"
                onError={(e) => {
                  console.error("이미지 로드 실패:", post.image_url, getImageUrl(post.image_url));
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <NoImage $darkMode={isDarkMode}>이미지가 없습니다</NoImage>
            )}
          </PostImageSection>

          <PostInfoSection $darkMode={isDarkMode}>
            <PostHeader $darkMode={isDarkMode}>
              <UserInfo>
                {post.author?.profile_image ? (
                  <Avatar
                    src={getImageUrl(post.author.profile_image)}
                    alt={post.author?.name || "사용자"}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <AvatarPlaceholder style={{ display: post.author?.profile_image ? "none" : "flex" }}>
                  👤
                </AvatarPlaceholder>
                <Username $darkMode={isDarkMode}>
                  {post.author?.name || post.author?.username || "알 수 없음"}
                </Username>
              </UserInfo>
            </PostHeader>

            <PostActions $darkMode={isDarkMode}>
              <ActionButton
                onClick={handleLike}
                $liked={isLiked}
                $darkMode={isDarkMode}
              >
                <Heart
                  size={24}
                  fill={isLiked ? "#ed4956" : "none"}
                  color={isLiked ? "#ed4956" : isDarkMode ? "#fff" : "#262626"}
                  strokeWidth={isLiked ? 2 : 1.5}
                />
              </ActionButton>
              <ActionButton $darkMode={isDarkMode}>
                <MessageCircle size={24} strokeWidth={1.5} />
              </ActionButton>
              <ActionButton $darkMode={isDarkMode}>
                <Send size={24} strokeWidth={1.5} />
              </ActionButton>
            </PostActions>

            <PostStats $darkMode={isDarkMode}>
              좋아요 {post.like_count || 0}개
            </PostStats>

            <PostTextSection $darkMode={isDarkMode}>
              <PostText $darkMode={isDarkMode}>
                <Username $darkMode={isDarkMode}>
                  {post.author?.name || post.author?.username || "알 수 없음"}
                </Username>{" "}
                {post.content || ""}
              </PostText>
            </PostTextSection>

            <CommentsSection $darkMode={isDarkMode}>
              {post.comments && post.comments.length > 0 ? (
                <CommentsList>
                  {post.comments.map((comment) => (
                    <CommentItem key={comment.id}>
                      <CommentAvatar>
                        {comment.author?.profile_image ? (
                          <img
                            src={getImageUrl(comment.author.profile_image)}
                            alt={comment.author?.name}
                          />
                        ) : (
                          "👤"
                        )}
                      </CommentAvatar>
                      <CommentContent>
                        <CommentUsername $darkMode={isDarkMode}>
                          {comment.author?.name || "알 수 없음"}
                        </CommentUsername>
                        <CommentText $darkMode={isDarkMode}>
                          {comment.content}
                        </CommentText>
                      </CommentContent>
                    </CommentItem>
                  ))}
                </CommentsList>
              ) : (
                <NoComments $darkMode={isDarkMode}>
                  댓글이 없습니다.
                </NoComments>
              )}

              <CommentInputSection $darkMode={isDarkMode}>
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
                  disabled={!commentText.trim()}
                  $darkMode={isDarkMode}
                >
                  게시
                </CommentSubmitButton>
              </CommentInputSection>
            </CommentsSection>
          </PostInfoSection>
        </PostContent>
      </Container>
    </>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  padding-bottom: 80px;

  @media (min-width: 768px) {
    max-width: 600px;
    margin: 0 auto;
  }
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  border-bottom: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 10;
`;

const BackButton = styled.button`
  background: transparent;
  border: none;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const HeaderTitle = styled.h1`
  font-size: 16px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const MoreButton = styled.button`
  background: transparent;
  border: none;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PostContent = styled.div`
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 60px);

  @media (min-width: 768px) {
    flex-direction: row;
    height: calc(100vh - 60px);
  }
`;

const PostImageSection = styled.div`
  width: 100%;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  overflow: hidden;

  @media (min-width: 768px) {
    width: 60%;
    height: 100%;
    flex: none;
  }
`;

const PostImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  display: block;
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

const PostInfoSection = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};

  @media (min-width: 768px) {
    width: 40%;
    border-top: none;
    border-left: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
    overflow-y: auto;
    height: 100%;
  }
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Avatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
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
`;

const Username = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const PostTextSection = styled.div`
  padding: 0 16px 12px 16px;
  border-bottom: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
`;

const PostText = styled.p`
  font-size: 14px;
  line-height: 1.5;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  white-space: pre-wrap;
  margin: 0;
`;

const PostActions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
`;

const ActionButton = styled.button`
  background: transparent;
  border: none;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PostStats = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  padding: 0 16px 8px 16px;
`;

const CommentsSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const CommentsList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
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
  background: ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
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
  margin-right: 8px;
`;

const CommentText = styled.span`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const NoComments = styled.div`
  text-align: center;
  padding: 32px 0;
  color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  font-size: 14px;
`;

const CommentInputSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
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
  color: ${(props) =>
    props.disabled
      ? props.$darkMode
        ? "#4a4a4a"
        : "#c7c7c7"
      : props.$darkMode
      ? "#0095f6"
      : "#0095f6"};
  font-size: 14px;
  font-weight: 600;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  padding: 8px 0;

  &:disabled {
    opacity: 0.5;
  }
`;

const LoadingMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  font-size: 16px;
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  font-size: 16px;
`;

export default PostDetail;

