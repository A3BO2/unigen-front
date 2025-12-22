import { useEffect, useState } from "react";
import styled from "styled-components";
import LeftSidebar from "../../components/normal/LeftSidebar";
import BottomNav from "../../components/normal/BottomNav";
import { Heart, MessageCircle, Send, Volume2, VolumeX } from "lucide-react";

import { getReel } from "../../services/post";

const Reels = () => {
  /* =========================
   * 상태
   ========================= */
  const [reels, setReels] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(true);
  const [noMoreReels, setNoMoreReels] = useState(false);
  const FILE_BASE_URL = import.meta.env.VITE_BASE_URL;

  /* =========================
   * 릴스 가져오기
   ========================= */
  const fetchReel = async () => {
    if (loading || noMoreReels) return;
    setLoading(true);

    try {
      const data = await getReel(cursor);

      if (!data.reel) {
        setNoMoreReels(true);
        return;
      }

      const reel = data.reel;

      setReels((prev) => {
        if (prev.some((r) => r.id === reel.id)) return prev;

        return [
          ...prev,
          {
            id: reel.id,
            video: reel.video_url
              ? `${FILE_BASE_URL}${reel.video_url.startsWith("/") ? "" : "/"}${
                  reel.video_url
                }`
              : null,
            image: reel.image_url
              ? `${FILE_BASE_URL}${reel.image_url.startsWith("/") ? "" : "/"}${
                  reel.image_url
                }`
              : null,
            user: {
              id: reel.author_id,
              name: reel.authorName || "알 수 없음", // 진짜 이름
              avatar: reel.authorProfile ? ( // 프사 있으면 이미지 태그, 없으면 이모지
                <img
                  src={reel.authorProfile}
                  alt="프사"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                "👤"
              ),
            },
            caption: reel.content,
            likes: reel.like_count,
            comments: reel.comment_count,
            liked: false,
            saved: false,
            isSeniorMode: reel.is_senior_mode,
            createdAt: reel.created_at,
          },
        ];
      });

      // ⭐ 핵심 안전장치
      if (data.nextCursor === cursor) {
        setNoMoreReels(true);
        return;
      }

      setCursor(data.nextCursor);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
   * 최초 1개 로딩
   ========================= */
  useEffect(() => {
    fetchReel();
  }, []);

  /* =========================
   * 스크롤 감지
   ========================= */
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      fetchReel();
    }
  };

  /* =========================
   * 좋아요 (UI 임시)
   ========================= */
  const handleLike = (id) => {
    setReels((prev) =>
      prev.map((reel) =>
        reel.id === id
          ? {
              ...reel,
              liked: !reel.liked,
              likes: reel.liked ? reel.likes - 1 : reel.likes + 1,
            }
          : reel
      )
    );
  };

  return (
    <>
      <LeftSidebar />
      <BottomNav />

      <Container>
        <ReelsContainer onScroll={handleScroll}>
          {reels.map((reel) => (
            <ReelWrapper key={reel.id}>
              <VideoContainer>
                {/* ✅ 영상 / 이미지 분기 렌더링 */}
                {reel.video ? (
                  <Video
                    src={reel.video}
                    autoPlay
                    loop
                    muted={muted}
                    playsInline
                  />
                ) : reel.image ? (
                  <Image src={reel.image} alt="reel image" />
                ) : null}

                {/* 🔊 볼륨 버튼은 영상일 때만 */}
                {reel.video && (
                  <VolumeButton onClick={() => setMuted(!muted)}>
                    {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </VolumeButton>
                )}

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
                      color="#fff"
                      fill={reel.liked ? "#fff" : "none"}
                    />
                    <ActionText>{reel.likes.toLocaleString()}</ActionText>
                  </ActionButton>

                  <ActionButton>
                    <MessageCircle size={28} color="#fff" />
                    <ActionText>{reel.comments}</ActionText>
                  </ActionButton>

                  <ActionButton>
                    <Send size={28} color="#fff" />
                  </ActionButton>
                </Actions>
              </VideoContainer>
            </ReelWrapper>
          ))}

          {reels.length === 0 && noMoreReels && (
            <EmptyState>
              <EmptyText>릴스가 없습니다.</EmptyText>
            </EmptyState>
          )}
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

const EmptyState = styled.div`
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EmptyText = styled.p`
  color: #aaa;
  font-size: 16px;
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover; /* ⭐ 핵심 */
  background: black;
`;

export default Reels;
