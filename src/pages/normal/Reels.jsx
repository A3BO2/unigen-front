import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useSearchParams } from "react-router-dom";
import LeftSidebar from "../../components/normal/LeftSidebar";
import BottomNav from "../../components/normal/BottomNav";
import { Heart, MessageCircle, Volume2, VolumeX } from "lucide-react";

import { getReel } from "../../services/post";

const Reels = () => {
  /* =========================
   * 상태
   ========================= */
  const [searchParams] = useSearchParams();
  const startId = searchParams.get("startId"); // 탐색탭에서 넘어온 릴스 ID

  const [reels, setReels] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [noMoreReels, setNoMoreReels] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const FILE_BASE_URL = import.meta.env.VITE_BASE_URL;

  // 🔊 전역 볼륨(원하면 릴스별로도 가능하지만 일단 전역 유지)
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0); // 0 ~ 1

  // ✅ “볼륨 UI 열림”은 현재 릴스 하나만 열리게
  const [openVolumeReelId, setOpenVolumeReelId] = useState(null);

  // ✅ video DOM들을 잡아서 volume/muted를 실제 엘리먼트에 동기화
  const videoRefs = useRef({}); // { [reelId]: HTMLVideoElement }

  /* =========================
   * 릴스 가져오기
   ========================= */
  const fetchReel = async (targetId = null) => {
    if (loading || noMoreReels) return;
    setLoading(true);

    try {
      // targetId가 있으면 그 기준으로, 없으면 cursor 기준
      const data = await getReel(targetId ?? cursor);

      if (!data?.reel) {
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
              ? `${FILE_BASE_URL}${reel.video_url.startsWith("/") ? "" : "/"}${reel.video_url}`
              : null,
            image: reel.image_url
              ? `${FILE_BASE_URL}${reel.image_url.startsWith("/") ? "" : "/"}${reel.image_url}`
              : null,
            user: {
              id: reel.author_id,
              name: reel.authorName || "알 수 없음",
              avatar: reel.authorProfile ? (
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

      // ⭐ 안전장치(서버가 같은 cursor를 주면 무한루프 방지)
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
   * 최초 로딩: startId 우선 적용
   ========================= */
  useEffect(() => {
    // ✅ startId가 있으면 그 릴스로부터 시작
    // (백엔드가 id < lastId 방식이면, startId를 "커서"로 넣으면 startId보다 작은 것부터 나오기 때문에
    // startId를 정확히 포함하고 싶으면 서버에서 startId fetch 전용을 만들거나,
    // 현재 구조라면 startId+1을 주는 방식이 보통 안정적)
    const init = async () => {
      if (initialLoaded) return;

      if (startId) {
        const s = Number(startId);
        if (Number.isFinite(s) && s > 0) {
          await fetchReel(s + 1); // ✅ startId 포함되게 한 칸 위에서 시작
        } else {
          await fetchReel();
        }
      } else {
        await fetchReel();
      }

      setInitialLoaded(true);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startId, initialLoaded]);

  /* =========================
   * 무한 스크롤
   ========================= */
  useEffect(() => {
    if (reels.length === 0) return;

    const lastReel = document.querySelector(
      `[data-reel-id="${reels[reels.length - 1].id}"]`
    );
    if (!lastReel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading && !noMoreReels) {
          fetchReel();
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(lastReel);
    return () => observer.disconnect();
  }, [reels, loading, noMoreReels]);

  /* =========================
   * 🔊 volume/muted 실제 video에 동기화
   ========================= */
  useEffect(() => {
    Object.values(videoRefs.current).forEach((videoEl) => {
      if (!videoEl) return;
      videoEl.muted = muted;
      videoEl.volume = muted ? 0 : volume;
    });
  }, [muted, volume]);

  /* =========================
   * 영상 클릭 시 재생/정지 토글
   ========================= */
  const togglePlay = (e) => {
    const video = e.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;
    if (!video.src) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
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
        <ReelsContainer>
          {reels.map((reel) => {
            const isOpen = openVolumeReelId === reel.id;

            return (
              <ReelWrapper key={reel.id} data-reel-id={reel.id}>
                <VideoContainer>
                  {/* ✅ 영상 / 이미지 분기 */}
                  {reel.video ? (
                    <Video
                      src={reel.video}
                      autoPlay
                      loop
                      muted={muted}
                      playsInline
                      onClick={togglePlay}
                      style={{ cursor: "pointer" }}
                      ref={(el) => {
                        if (!el) return;
                        videoRefs.current[reel.id] = el;
                        el.muted = muted;
                        el.volume = muted ? 0 : volume;
                      }}
                    />
                  ) : reel.image ? (
                    <Image src={reel.image} alt="reel image" />
                  ) : null}
<OverlayUI>
                  <ReelInfo>
                    <UserInfo>
                      <Avatar>{reel.user.avatar}</Avatar>
                      <Username>{reel.user.name}</Username>
                      <FollowButton>팔로우</FollowButton>
                    </UserInfo>
                    <Caption>{reel.caption}</Caption>
                  </ReelInfo>

                  <Actions>
                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(reel.id);
                      }}
                    >
                      <Heart
                        size={28}
                        color="#fff"
                        fill={reel.liked ? "#fff" : "none"}
                      />
                      <ActionText>{reel.likes.toLocaleString()}</ActionText>
                    </ActionButton>

                    <ActionButton onClick={(e) => e.stopPropagation()}>
                      <MessageCircle size={28} color="#fff" />
                      <ActionText>{reel.comments}</ActionText>
                    </ActionButton>
                    {/* 🔊 볼륨 버튼 */}
{reel.video && (
  <VolumeButtonWrapper>
    <ActionButton
      onClick={(e) => {
        e.stopPropagation();

        setOpenVolumeReelId((prev) =>
          prev === reel.id ? null : reel.id
        );

        if (muted) {
          setMuted(false);
          setVolume((v) => (v > 0 ? v : 0.7));
        }
      }}
    >
      {muted || volume === 0 ? (
        <VolumeX size={28} color="#fff" />
      ) : (
        <Volume2 size={28} color="#fff" />
      )}
    </ActionButton>

    {isOpen && (
      <VolumeSlider
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={muted ? 0 : volume}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onChange={(e) => {
          const v = Number(e.target.value);
          setVolume(v);
          setMuted(v === 0);
        }}
      />
    )}
  </VolumeButtonWrapper>
)}

                  </Actions>
                  </OverlayUI>
                </VideoContainer>
              </ReelWrapper>
            );
          })}
        </ReelsContainer>
      </Container>
    </>
  );
};

const VolumeButtonWrapper = styled.div`
  position: relative;   /* 🎯 기준점 */
`;

const VolumeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  /* 슬라이더가 왼쪽으로 튀어나와도 잘 보이게 */
  overflow: visible;
`;

const OverlayUI = styled.div`
  position: absolute;
  inset: 0;               /* VideoContainer 전체 기준 */
  pointer-events: none;   /* 기본은 터치 막기 */

  > * {
    pointer-events: auto; /* 버튼만 터치 가능 */
  }
`;

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


const VolumeSlider = styled.input`
  position: absolute;
  right: 60px;          /* 🔥 아이콘 왼쪽 */
  top: 50%;
  transform: translateY(-50%);

  width: 80px;

  appearance: none;
  height: 3px;
  background: rgba(255, 255, 255, 0.35);
  border-radius: 4px;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 10px;
    height: 10px;
    background: #fff;
    border-radius: 50%;
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
  right: 12px;
  bottom: 120px;   /* 🔥 이 값은 이제 “영상 기준” */
  display: flex;
  flex-direction: column;
  gap: 22px;
  z-index: 10;
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
  object-fit: cover;
  background: black;
`;

export default Reels;
