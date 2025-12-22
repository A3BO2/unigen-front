import { useState } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { Heart, MessageCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import SeniorBottomNav from '../../components/senior/BottomNav';

// Mock 데이터
const INITIAL_POSTS = [
  {
    id: 1,
    user: { name: '김할머니', avatar: '👵' },
    content: '오늘 공원에 산책 다녀왔어요. 날씨가 정말 좋았답니다. 손주들도 보고 왔어요.',
    photo: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
    likes: 24,
    timestamp: '2시간 전',
    liked: false,
    comments: [
      { id: 1, user: { name: '박할아버지', avatar: '👴' }, text: '저도 오늘 산책했어요!', time: '1시간 전' },
      { id: 2, user: { name: '최할머니', avatar: '👵' }, text: '손주들 만나셨군요. 좋으시겠어요.', time: '1시간 전' },
      { id: 3, user: { name: '정할아버지', avatar: '👴' }, text: '날씨 정말 좋았죠~', time: '30분 전' },
      { id: 4, user: { name: '강할머니', avatar: '👵' }, text: '공원 어디로 가셨어요?', time: '20분 전' },
      { id: 5, user: { name: '윤할아버지', avatar: '👴' }, text: '다음에 같이 가요!', time: '10분 전' }
    ]
  },
  {
    id: 2,
    user: { name: '박할아버지', avatar: '👴' },
    content: '요즘 텃밭 가꾸는 재미가 쏠쏠하네요. 토마토가 잘 자라고 있습니다.',
    photo: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800&h=600&fit=crop',
    likes: 18,
    timestamp: '5시간 전',
    liked: false,
    comments: [
      { id: 1, user: { name: '이할머니', avatar: '👵' }, text: '토마토 키우기 어렵지 않나요?', time: '4시간 전' },
      { id: 2, user: { name: '김할머니', avatar: '👵' }, text: '저도 텃밭 시작해볼까 해요.', time: '3시간 전' },
      { id: 3, user: { name: '최할아버지', avatar: '👴' }, text: '부럽네요!', time: '2시간 전' }
    ]
  },
  {
    id: 3,
    user: { name: '이할머니', avatar: '👵' },
    content: '손주가 그려준 그림을 받았어요. 너무 예쁘죠? 행복한 하루입니다.',
    photo: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=600&fit=crop',
    likes: 42,
    timestamp: '1일 전',
    liked: false,
    comments: [
      { id: 1, user: { name: '김할머니', avatar: '👵' }, text: '정말 예쁘네요!', time: '1일 전' },
      { id: 2, user: { name: '박할아버지', avatar: '👴' }, text: '손주분이 재능이 있으시네요.', time: '1일 전' },
      { id: 3, user: { name: '정할머니', avatar: '👵' }, text: '저도 손주 그림 받고 싶어요.', time: '20시간 전' },
      { id: 4, user: { name: '최할아버지', avatar: '👴' }, text: '액자로 만들어두세요!', time: '18시간 전' },
      { id: 5, user: { name: '강할머니', avatar: '👵' }, text: '너무 사랑스러워요.', time: '15시간 전' },
      { id: 6, user: { name: '윤할아버지', avatar: '👴' }, text: '보기 좋습니다.', time: '12시간 전' },
      { id: 7, user: { name: '서할머니', avatar: '👵' }, text: '손주가 몇 살인가요?', time: '10시간 전' },
      { id: 8, user: { name: '장할아버지', avatar: '👴' }, text: '따뜻한 마음이 느껴져요.', time: '8시간 전' }
    ]
  }
];

const Home = () => {
  const { isDarkMode } = useApp();
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});

  const handleLike = (postId) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          liked: !post.liked,
          likes: post.liked ? post.likes - 1 : post.likes + 1
        };
      }
      return post;
    }));
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleCommentChange = (postId, value) => {
    setCommentInputs(prev => ({
      ...prev,
      [postId]: value
    }));
  };

  const handleCommentSubmit = (postId) => {
    const commentText = commentInputs[postId];
    if (!commentText || !commentText.trim()) {
      return;
    }

    const newComment = {
      id: Date.now(),
      user: { name: '나', avatar: '😊' },
      text: commentText,
      time: '방금 전'
    };

    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [...post.comments, newComment]
        };
      }
      return post;
    }));

    setCommentInputs(prev => ({
      ...prev,
      [postId]: ''
    }));
  };

  return (
    <ThemeProvider theme={{ $darkMode: isDarkMode }}>
      <Container>
        <Header>
          <Logo>친구소식</Logo>
        </Header>

        <Feed>
        {posts.map((post) => (
          <Post key={post.id}>
            <PostHeader>
              <UserInfo>
                <Avatar>{post.user.avatar}</Avatar>
                <UserDetails>
                  <Username>{post.user.name}</Username>
                  <Timestamp>{post.timestamp}</Timestamp>
                </UserDetails>
              </UserInfo>
            </PostHeader>

            <Content>{post.content}</Content>

            {post.photo && (
              <PostImage src={post.photo} alt="게시물 사진" />
            )}

            <PostActions>
              <ActionButton onClick={() => handleLike(post.id)} $liked={post.liked}>
                <Heart
                  size={36}
                  strokeWidth={3}
                  fill={post.liked ? '#ff4458' : 'none'}
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
                <CommentsHeader>댓글 {post.comments.length}개</CommentsHeader>

                <CommentInputSection>
                  <CommentInputWrapper>
                    <CommentInput
                      placeholder="댓글을 입력하세요..."
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => handleCommentChange(post.id, e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleCommentSubmit(post.id);
                        }
                      }}
                    />
                    <CommentSubmitButton onClick={() => handleCommentSubmit(post.id)}>
                      등록
                    </CommentSubmitButton>
                  </CommentInputWrapper>
                </CommentInputSection>

                <CommentsList>
                  {post.comments.map((comment) => (
                    <CommentItem key={comment.id}>
                      <CommentAvatar>{comment.user.avatar}</CommentAvatar>
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
        ))}
        </Feed>

        <SeniorBottomNav />
      </Container>
    </ThemeProvider>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.$darkMode ? '#000' : '#fff'};
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
  padding-bottom: 80px;

  @media (min-width: 768px) {
    max-width: 600px;
    margin: 0 auto;
  }
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  background: ${props => props.theme.$darkMode ? '#000' : '#fff'};
  border-bottom: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
  padding: 24px;
  z-index: 10;
`;

const Logo = styled.h1`
  font-size: calc(36px * var(--font-scale, 1));
  font-weight: 700;

  @media (min-width: 768px) {
    font-size: calc(40px * var(--font-scale, 1));
  }
`;

const Feed = styled.div`
  max-width: 100%;
`;

const Post = styled.article`
  border-bottom: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
  padding: 28px;
  transition: background 0.2s;

  &:active {
    background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
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
`;

const Avatar = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(32px * var(--font-scale, 1));
  flex-shrink: 0;
  border: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Username = styled.span`
  font-size: calc(24px * var(--font-scale, 1));
  font-weight: 700;
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
`;

const Timestamp = styled.span`
  font-size: calc(18px * var(--font-scale, 1));
  color: ${props => props.theme.$darkMode ? '#999' : '#666'};
`;

const Content = styled.p`
  font-size: calc(24px * var(--font-scale, 1));
  line-height: 1.7;
  margin-bottom: 24px;
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
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
  color: ${props => props.$liked ? '#ff4458' : (props.theme.$darkMode ? '#999' : '#666')};
  padding: 16px 20px;
  border-radius: 12px;
  min-height: 56px;
  transition: all 0.2s;

  &:active {
    background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
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
  color: ${props => props.$liked ? '#ff4458' : (props.theme.$darkMode ? '#fff' : '#000')};
  min-width: 36px;
`;

const CommentsSection = styled.div`
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
`;

const CommentsHeader = styled.h3`
  font-size: calc(22px * var(--font-scale, 1));
  font-weight: 700;
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
  margin-bottom: 20px;
`;

const CommentInputSection = styled.div`
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
`;

const CommentInputWrapper = styled.div`
  display: flex;
  gap: 12px;
  align-items: stretch;
`;

const CommentInput = styled.textarea`
  flex: 1;
  background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
  border: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
  border-radius: 12px;
  padding: 16px;
  font-size: calc(20px * var(--font-scale, 1));
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
  resize: none;
  min-height: 80px;
  line-height: 1.5;

  &::placeholder {
    color: ${props => props.theme.$darkMode ? '#6a6a6a' : '#999'};
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
  border-bottom: 1px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#f0f0f0'};

  &:last-child {
    border-bottom: none;
  }
`;

const CommentAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(28px * var(--font-scale, 1));
  flex-shrink: 0;
  border: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
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
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
`;

const CommentTime = styled.span`
  font-size: calc(16px * var(--font-scale, 1));
  color: ${props => props.theme.$darkMode ? '#999' : '#666'};
`;

const CommentText = styled.p`
  font-size: calc(20px * var(--font-scale, 1));
  line-height: 1.6;
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
  word-break: keep-all;
`;

export default Home;
