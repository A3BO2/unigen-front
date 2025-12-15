import { useState } from 'react';
import styled from 'styled-components';
import LeftSidebar from '../../components/normal/LeftSidebar';
import BottomNav from '../../components/normal/BottomNav';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Volume2, VolumeX } from 'lucide-react';

// Mock 릴스 데이터
const REELS_DATA = [
  {
    id: 1,
    video: 'https://videos.pexels.com/video-files/3843433/3843433-uhd_2160_4096_25fps.mp4',
    user: { name: '김할머니', avatar: '👵' },
    caption: '오늘 공원 산책하고 왔어요 🌳',
    likes: 1234,
    comments: 89,
    liked: false,
    saved: false,
  },
  {
    id: 2,
    video: 'https://videos.pexels.com/video-files/2473243/2473243-uhd_2160_4096_25fps.mp4',
    user: { name: '박할아버지', avatar: '👴' },
    caption: '손주들과 함께한 즐거운 시간 ❤️',
    likes: 2567,
    comments: 145,
    liked: false,
    saved: false,
  },
  {
    id: 3,
    video: 'https://videos.pexels.com/video-files/3843452/3843452-uhd_2160_4096_25fps.mp4',
    user: { name: '이할머니', avatar: '👵' },
    caption: '정원에 꽃이 활짝 피었네요 🌸',
    likes: 987,
    comments: 56,
    liked: false,
    saved: false,
  },
];

const Reels = () => {
  const [reels, setReels] = useState(REELS_DATA);
  const [muted, setMuted] = useState(true);

  const handleLike = (reelId) => {
    setReels(reels.map(reel => {
      if (reel.id === reelId) {
        return {
          ...reel,
          liked: !reel.liked,
          likes: reel.liked ? reel.likes - 1 : reel.likes + 1
        };
      }
      return reel;
    }));
  };

  const handleSave = (reelId) => {
    setReels(reels.map(reel => {
      if (reel.id === reelId) {
        return {
          ...reel,
          saved: !reel.saved
        };
      }
      return reel;
    }));
  };

  return (
    <>
      <LeftSidebar />
      <BottomNav />

      <Container>
        <ReelsContainer>
          {reels.map((reel) => (
            <ReelWrapper key={reel.id}>
              <VideoContainer>
                <Video
                  src={reel.video}
                  loop
                  autoPlay
                  muted={muted}
                  playsInline
                />

                <VolumeButton onClick={() => setMuted(!muted)}>
                  {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </VolumeButton>

                <ReelInfo>
                  <UserInfo>
                    <Avatar>{reel.user.avatar}</Avatar>
                    <Username>{reel.user.name}</Username>
                    <FollowButton>팔로우</FollowButton>
                  </UserInfo>
                  <Caption>{reel.caption}</Caption>
                </ReelInfo>

                <Actions>
                  <ActionButton onClick={() => handleLike(reel.id)}>
                    <Heart
                      size={28}
                      fill={reel.liked ? '#fff' : 'none'}
                      color="#fff"
                      strokeWidth={2}
                    />
                    <ActionText>{reel.likes.toLocaleString()}</ActionText>
                  </ActionButton>

                  <ActionButton>
                    <MessageCircle size={28} color="#fff" strokeWidth={2} />
                    <ActionText>{reel.comments}</ActionText>
                  </ActionButton>

                  <ActionButton>
                    <Send size={28} color="#fff" strokeWidth={2} />
                  </ActionButton>
                </Actions>
              </VideoContainer>
            </ReelWrapper>
          ))}
        </ReelsContainer>
      </Container>
    </>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: #000;

  @media (min-width: 768px) {
    margin-left: 72px;
  }

  @media (max-width: 767px) {
    margin-left: 0;
    padding-bottom: 60px;
  }
`;

const ReelsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  scroll-snap-type: y mandatory;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const ReelWrapper = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: start;
  position: relative;
`;

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 480px;
  height: 100vh;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const VolumeButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;

  &:hover {
    background: rgba(0, 0, 0, 0.7);
  }
`;

const ReelInfo = styled.div`
  position: absolute;
  bottom: 80px;
  left: 16px;
  right: 80px;
  z-index: 5;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
`;

const Username = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #fff;
`;

const FollowButton = styled.button`
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  padding: 4px 16px;
  border: 1px solid #fff;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const Caption = styled.p`
  font-size: 14px;
  color: #fff;
  line-height: 18px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const Actions = styled.div`
  position: absolute;
  right: 16px;
  bottom: 80px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  z-index: 5;
`;

const ActionButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const ActionText = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #fff;
`;

export default Reels;
