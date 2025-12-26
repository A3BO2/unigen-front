import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { ThemeProvider } from 'styled-components';
import { Heart, MessageCircle, ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import SeniorBottomNav from '../../components/senior/BottomNav';
import { getPostById } from '../../services/post';
// 상대 시간 포맷 함수
const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return '방금 전';
};

const baseURL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
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
  const [commentInput, setCommentInput] = useState('');

  useEffect(() => {
    const loadPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPostById(id);
        setPost(data);
      } catch (err) {
        console.error('게시물 로드 실패:', err);
        setError(err.message || '게시물을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadPost();
    }
  }, [id]);

  const handleLike = () => {
    if (post) {
      setPost({
        ...post,
        liked: !post.liked,
        likes: post.liked ? post.likes - 1 : post.likes + 1,
      });
    }
  };

  const handleCommentSubmit = () => {
    if (!commentInput.trim() || !post) return;

    const newComment = {
      id: Date.now(),
      user: { name: '나', avatar: '😊' },
      text: commentInput,
      time: '방금 전',
    };

    setPost({
      ...post,
      comments: [...post.comments, newComment],
    });

    setCommentInput('');
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
            <ErrorText>{error || '게시물을 찾을 수 없습니다.'}</ErrorText>
            <BackButton onClick={() => navigate('/senior/profile')}>
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
          <BackButton onClick={() => navigate('/senior/profile')}>
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
                (post.user.avatar.startsWith('http') ||
                  post.user.avatar.startsWith('/')) ? (
                  <AvatarImage src={getImageUrl(post.user.avatar)} alt={post.user.name} />
                ) : (
                  post.user.avatar || '👤'
                )}
              </Avatar>
              <UserDetails>
                <Username>{post.user.name}</Username>
                <Timestamp>{post.timestamp}</Timestamp>
              </UserDetails>
            </UserInfo>
          </PostHeader>

          <Content>{post.content}</Content>

          {post.photo && <PostImage src={getImageUrl(post.photo)} alt="게시물 사진" />}

          <PostActions>
            <ActionButton onClick={handleLike} $liked={post.liked}>
              <Heart
                size={36}
                strokeWidth={3}
                fill={post.liked ? '#ff4458' : 'none'}
              />
              <ActionText $liked={post.liked}>{post.likes}</ActionText>
            </ActionButton>
            <ActionButton onClick={() => setExpandedComments(!expandedComments)}>
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
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleCommentSubmit();
                      }
                    }}
                  />
                  <CommentSubmitButton onClick={handleCommentSubmit}>
                    등록
                  </CommentSubmitButton>
                </CommentInputWrapper>
              </CommentInputSection>

              <CommentsList>
                {post.comments.map((comment) => (
                  <CommentItem key={comment.id}>
                    <CommentAvatar>
                      {comment.user.avatar &&
                      (comment.user.avatar.startsWith('http') ||
                        comment.user.avatar.startsWith('/')) ? (
                        <AvatarImage
                          src={getImageUrl(comment.user.avatar)}
                          alt={comment.user.name}
                        />
                      ) : (
                        comment.user.avatar || '👤'
                      )}
                    </CommentAvatar>
                    <CommentContent>
                      <CommentHeader>
                        <CommentUsername>{comment.user.name}</CommentUsername>
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
  background: ${(props) => (props.theme.$darkMode ? '#000' : '#fff')};
  color: ${(props) => (props.theme.$darkMode ? '#fff' : '#000')};
  padding-bottom: 80px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  background: ${(props) => (props.theme.$darkMode ? '#000' : '#fff')};
  border-bottom: 2px solid
    ${(props) => (props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0')};
  padding: 20px 24px;
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
  color: ${(props) => (props.theme.$darkMode ? '#fff' : '#000')};
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
  color: ${(props) => (props.theme.$darkMode ? '#999' : '#666')};
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
  color: ${(props) => (props.theme.$darkMode ? '#ff6b6b' : '#e74c3c')};
  text-align: center;
`;

const Post = styled.article`
  border-bottom: 2px solid
    ${(props) => (props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0')};
  padding: 28px;
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
`;

const Avatar = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${(props) => (props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5')};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(32px * var(--font-scale, 1));
  flex-shrink: 0;
  border: 2px solid
    ${(props) => (props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0')};
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
`;

const Username = styled.span`
  font-size: calc(24px * var(--font-scale, 1));
  font-weight: 700;
  color: ${(props) => (props.theme.$darkMode ? '#fff' : '#000')};
`;

const Timestamp = styled.span`
  font-size: calc(18px * var(--font-scale, 1));
  color: ${(props) => (props.theme.$darkMode ? '#999' : '#666')};
`;

const Content = styled.p`
  font-size: calc(24px * var(--font-scale, 1));
  line-height: 1.7;
  margin-bottom: 24px;
  color: ${(props) => (props.theme.$darkMode ? '#fff' : '#000')};
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
    props.$liked ? '#ff4458' : props.theme.$darkMode ? '#999' : '#666'};
  padding: 16px 20px;
  border-radius: 12px;
  min-height: 56px;
  transition: all 0.2s;
  border: none;
  background: transparent;
  cursor: pointer;

  &:active {
    background: ${(props) => (props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5')};
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
    props.$liked ? '#ff4458' : props.theme.$darkMode ? '#fff' : '#000'};
  min-width: 36px;
`;

const CommentsSection = styled.div`
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid
    ${(props) => (props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0')};
`;

const CommentsHeader = styled.h3`
  font-size: calc(22px * var(--font-scale, 1));
  font-weight: 700;
  color: ${(props) => (props.theme.$darkMode ? '#fff' : '#000')};
  margin-bottom: 20px;
`;

const CommentInputSection = styled.div`
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 2px solid
    ${(props) => (props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0')};
`;

const CommentInputWrapper = styled.div`
  display: flex;
  gap: 12px;
  align-items: stretch;
`;

const CommentInput = styled.textarea`
  flex: 1;
  background: ${(props) => (props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5')};
  border: 2px solid
    ${(props) => (props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0')};
  border-radius: 12px;
  padding: 16px;
  font-size: calc(20px * var(--font-scale, 1));
  color: ${(props) => (props.theme.$darkMode ? '#fff' : '#000')};
  resize: none;
  min-height: 80px;
  line-height: 1.5;

  &::placeholder {
    color: ${(props) => (props.theme.$darkMode ? '#6a6a6a' : '#999')};
  }

  &:focus {
    border-color: #0095f6;
    outline: none;
  }
`;

const CommentSubmitButton = styled.button`
  background: #0095f6;
  color: #fff;
  font-size: calc(20px * var(--font-scale, 1));
  font-weight: 700;
  padding: 16px 28px;
  border-radius: 12px;
  min-height: 80px;
  border: 2px solid #0095f6;
  transition: all 0.2s;
  cursor: pointer;

  &:active {
    transform: scale(0.95);
    background: #1877f2;
    border-color: #1877f2;
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
    ${(props) => (props.theme.$darkMode ? '#2a2a2a' : '#f0f0f0')};

  &:last-child {
    border-bottom: none;
  }
`;

const CommentAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${(props) => (props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5')};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(28px * var(--font-scale, 1));
  flex-shrink: 0;
  border: 2px solid
    ${(props) => (props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0')};
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
  color: ${(props) => (props.theme.$darkMode ? '#fff' : '#000')};
`;

const CommentTime = styled.span`
  font-size: calc(16px * var(--font-scale, 1));
  color: ${(props) => (props.theme.$darkMode ? '#999' : '#666')};
`;

const CommentText = styled.p`
  font-size: calc(20px * var(--font-scale, 1));
  line-height: 1.6;
  color: ${(props) => (props.theme.$darkMode ? '#fff' : '#000')};
  word-break: keep-all;
`;

export default PostDetail;

