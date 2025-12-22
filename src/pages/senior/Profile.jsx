import { useState, useEffect } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import SeniorBottomNav from '../../components/senior/BottomNav';
import { getUserSettings } from '../../services/user';

// Mock 데이터
const MY_POSTS = [
  {
    id: 1,
    content: '오늘 공원에 산책 다녀왔어요. 날씨가 정말 좋았답니다.',
    photo: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
    likes: 24,
    time: '2시간 전'
  },
  {
    id: 2,
    content: '요즘 텃밭 가꾸는 재미가 쏠쏠하네요. 토마토가 잘 자라고 있습니다.',
    photo: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800&h=600&fit=crop',
    likes: 18,
    time: '1일 전'
  },
  {
    id: 3,
    content: '손주가 그려준 그림을 받았어요. 너무 예쁘죠? 행복한 하루입니다.',
    photo: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=600&fit=crop',
    likes: 42,
    time: '3일 전'
  }
];

const Profile = () => {
  const { user, isDarkMode } = useApp();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    fontScale: 'large',
    notificationsOn: true,
    seniorSimpleMode: true,
    language: 'ko'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const data = await getUserSettings();
        setSettings(data);
      } catch (error) {
        console.error('설정 조회 실패:', error);
        // 에러 발생 시 기본값 유지
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return (
    <ThemeProvider theme={{ $darkMode: isDarkMode }}>
      <Container>
        <Header>
          <Title>내 정보</Title>
        </Header>

        <ProfileSection>
          <Avatar>👤</Avatar>
          <Name>{user?.name || '사용자'}</Name>
          <Phone>{user?.phone || '전화번호'}</Phone>
        </ProfileSection>

        <QuickActions>
          <QuickActionButton onClick={() => navigate('/senior/settings')}>
            <ActionTitle>글자 · 알림 설정</ActionTitle>
            <ActionDescription>
              {!loading && (
                <>
                  글씨 크기: {settings.fontScale === 'small' ? '작게' : settings.fontScale === 'medium' ? '보통' : '크게'} · 
                  알림: {settings.notificationsOn ? '켜짐' : '꺼짐'}
                </>
              )}
              {loading && '글씨 크기와 알림을 한눈에 조절해요'}
            </ActionDescription>
          </QuickActionButton>
          <QuickActionButton onClick={() => navigate('/senior/help')}>
            <ActionTitle>가족에게 도움 요청하기</ActionTitle>
            <ActionDescription>가족에게 바로 연락하고 도움을 받아요</ActionDescription>
          </QuickActionButton>
        </QuickActions>

        <SectionHeader>
          내가 남긴 이야기 {MY_POSTS.length}개
        </SectionHeader>

        <ContentSection>
          {MY_POSTS.map((post) => (
            <PostCard key={post.id}>
              {post.photo && (
                <PostImage src={post.photo} alt="게시물 사진" />
              )}
              <PostContent>{post.content}</PostContent>
              <PostMeta>
                <PostTime>{post.time}</PostTime>
                <PostStats>좋아요 {post.likes}개</PostStats>
              </PostMeta>
            </PostCard>
          ))}
        </ContentSection>

        <HelpSection>
          <HelpTitle>가족에게 보여줄 QR 코드를 만들 수 있어요</HelpTitle>
          <HelpDescription>
            가족이 QR 코드를 스캔하면 계정을 연결하고 설정을 도와줄 수 있습니다.
          </HelpDescription>
          <HelpButton onClick={() => navigate('/senior/help')}>
            QR 코드 만들기
          </HelpButton>
        </HelpSection>

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
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  background: ${props => props.theme.$darkMode ? '#000' : '#fff'};
  border-bottom: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
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

const ProfileSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px;
  border-bottom: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
`;

const Avatar = styled.div`
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
  margin-bottom: 16px;
  border: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
`;

const Name = styled.h2`
  font-size: calc(28px * var(--font-scale, 1));
  font-weight: 700;
  margin-bottom: 8px;
`;

const Phone = styled.p`
  font-size: calc(18px * var(--font-scale, 1));
  color: ${props => props.theme.$darkMode ? '#999' : '#666'};
`;

const QuickActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
`;

const QuickActionButton = styled.button`
  width: 100%;
  padding: 20px;
  border-radius: 16px;
  background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
  border: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
  text-align: left;
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;
  gap: 6px;

  &:active {
    transform: scale(0.98);
  }
`;

const ActionTitle = styled.span`
  font-size: calc(22px * var(--font-scale, 1));
  font-weight: 700;
  color: ${props => props.theme.$darkMode ? '#fff' : '#222'};
`;

const ActionDescription = styled.span`
  font-size: calc(16px * var(--font-scale, 1));
  color: ${props => props.theme.$darkMode ? '#bbb' : '#666'};
`;

const SectionHeader = styled.h2`
  font-size: calc(24px * var(--font-scale, 1));
  font-weight: 700;
  padding: 0 24px;
  margin-bottom: 16px;
`;

const ContentSection = styled.div`
  padding: 24px;
`;

const HelpSection = styled.div`
  margin: 0 24px 32px;
  padding: 24px;
  border-radius: 16px;
  background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
  border: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
  text-align: center;
`;

const HelpTitle = styled.h3`
  font-size: calc(22px * var(--font-scale, 1));
  font-weight: 700;
  margin-bottom: 12px;
`;

const HelpDescription = styled.p`
  font-size: calc(18px * var(--font-scale, 1));
  color: ${props => props.theme.$darkMode ? '#ccc' : '#555'};
  margin-bottom: 16px;
  line-height: 1.5;
`;

const HelpButton = styled.button`
  width: 100%;
  padding: 18px;
  font-size: calc(22px * var(--font-scale, 1));
  font-weight: 700;
  border-radius: 12px;
  background: #ffb703;
  color: #000;

  &:active {
    opacity: 0.8;
  }
`;

const PostCard = styled.div`
  background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const PostAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${props => props.theme.$darkMode ? '#0a0a0a' : '#fff'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  border: 2px solid ${props => props.theme.$darkMode ? '#3a3a3a' : '#d0d0d0'};
`;

const PostUsername = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
`;

const PostImage = styled.img`
  width: 100%;
  border-radius: 12px;
  margin-bottom: 16px;
  object-fit: cover;
  max-height: 400px;
`;

const PostContent = styled.p`
  font-size: calc(20px * var(--font-scale, 1));
  line-height: 1.6;
  margin-bottom: 16px;
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
`;

const PostMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PostTime = styled.span`
  font-size: calc(16px * var(--font-scale, 1));
  color: ${props => props.theme.$darkMode ? '#999' : '#666'};
`;

const PostStats = styled.span`
  font-size: calc(16px * var(--font-scale, 1));
  color: ${props => props.theme.$darkMode ? '#999' : '#666'};
`;

export default Profile;
