import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useSearchParams } from "react-router-dom";
import LeftSidebar from "../../components/normal/LeftSidebar";
import BottomNav from "../../components/normal/BottomNav";
import { Heart, MessageCircle, Volume2, VolumeX } from "lucide-react";
import { getTimeAgo } from "../../util/date";

import {
  fetchComments,
  createComment,
  deleteComment,
} from "../../services/comment";

import { getReel } from "../../services/post";

const Reels = () => {
  const [searchParams] = useSearchParams();
  const startId = searchParams.get("startId");

  const [reels, setReels] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [noMoreReels, setNoMoreReels] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const FILE_BASE_URL = import.meta.env.VITE_BASE_URL;

  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0);
  const [openVolumeReelId, setOpenVolumeReelId] = useState(null);

  const videoRefs = useRef({});

  const [showComments, setShowComments] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  /* =========================
   * 릴스 가져오기
   ========================= */
  const fetchReel = async (targetId = null) => {
    if (loading || noMoreReels) return;
    setLoading(true);

    try {
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
              avatar: reel.authorProfile || null,
            },
            caption: reel.content,
            likes: reel.like_count,
            comments: reel.comment_count,
            liked: false,
            createdAt: reel.created_at,
          },
        ];
      });

      if (data.nextCursor === cursor) {
        setNoMoreReels(true);
        return;
      }

      setCursor(data.nextCursor);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
   * 댓글 불러오기
   ========================= */
  useEffect(() => {
    if (!showComments) return;

    const load = async () => {
      setCommentLoading(true);
      try {
        const res = await fetchComments(showComments);
        setComments(res.comments);
      } catch (e) {
        console.error(e);
      } finally {
        setCommentLoading(false);
      }
    };

    load();
  }, [showComments]);

  /* =========================
   * 최초 로딩
   ========================= */
  useEffect(() => {
    if (initialLoaded) return;

    const init = async () => {
      if (startId) {
        await fetchReel(Number(startId) + 1);
      } else {
        await fetchReel();
      }
      setInitialLoaded(true);
    };

    init();
  }, [startId, initialLoaded]);

  /* =========================
   * 무한 스크롤
   ========================= */
  useEffect(() => {
    if (reels.length === 0) return;

    const last = document.querySelector(
      `[data-reel-id="${reels[reels.length - 1].id}"]`
    );
    if (!last) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading && !noMoreReels) {
          fetchReel();
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(last);
    return () => observer.disconnect();
  }, [reels, loading, noMoreReels]);

  /* =========================
   * 볼륨 동기화
   ========================= */
  useEffect(() => {
    Object.values(videoRefs.current).forEach((v) => {
      if (!v) return;
      v.muted = muted;
      v.volume = muted ? 0 : volume;
    });
  }, [muted, volume]);

  /* =========================
   * 댓글 생성 (🔥 핵심 수정)
   ========================= */
  const handleCreateComment = async () => {
    if (!commentInput.trim()) return;

    try {
      await createComment(showComments, commentInput);

      // ✅ 서버 기준으로 다시 fetch
      const res = await fetchComments(showComments);
      setComments(res.comments);

      setReels((prev) =>
        prev.map((r) =>
          r.id === showComments
            ? { ...r, comments: r.comments + 1 }
            : r
        )
      );

      setCommentInput("");
    } catch (e) {
      console.error("댓글 작성 실패", e);
    }
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
                  {reel.video ? (
                    <Video
                      src={reel.video}
                      autoPlay
                      loop
                      muted={muted}
                      playsInline
                      ref={(el) => (videoRefs.current[reel.id] = el)}
                    />
                  ) : reel.image ? (
                    <Image src={reel.image} />
                  ) : null}

                  <OverlayUI>
                    <ReelInfo>
                      <UserInfo>
                        <Avatar>👤</Avatar>
                        <Username>{reel.user.name}</Username>
                      </UserInfo>
                      <Caption>{reel.caption}</Caption>
                    </ReelInfo>

                    <Actions>
                      <ActionButton>
                        <Heart size={28} color="#fff" />
                        <ActionText>{reel.likes}</ActionText>
                      </ActionButton>

                      <ActionButton onClick={() => setShowComments(reel.id)}>
                        <MessageCircle size={28} color="#fff" />
                        <ActionText>{reel.comments}</ActionText>
                      </ActionButton>

                      {reel.video && (
                        <VolumeButtonWrapper>
                          <ActionButton
                            onClick={() => {
                              setOpenVolumeReelId(isOpen ? null : reel.id);
                              if (muted) {
                                setMuted(false);
                                setVolume(0.7);
                              }
                            }}
                          >
                            {muted ? (
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

      {showComments && (
        <CommentOverlay onClick={() => setShowComments(null)}>
          <CommentSheet onClick={(e) => e.stopPropagation()}>
            <CommentHeader>댓글</CommentHeader>

            <CommentList>
              {commentLoading ? (
                <EmptyText>불러오는 중...</EmptyText>
              ) : comments.length === 0 ? (
                <EmptyText>첫 댓글을 남겨보세요</EmptyText>
              ) : (
                comments.map((c) => (
                  <CommentItem key={c.id}>
                    <AvatarImg
                      src={
                        c.user?.avatar
                          ? c.user.avatar.startsWith("http")
                            ? c.user.avatar
                            : `${FILE_BASE_URL}${c.user.avatar}`
                          : "/default-avatar.png"
                      }
                    />
                    <div>
                      <b>{c.user.name}</b>
                      <span>{c.text}</span>
                      <Time>{getTimeAgo(c.createdAt)}</Time>
                    </div>
                  </CommentItem>
                ))
              )}
            </CommentList>

            <CommentInputBox>
              <CommentInput
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="댓글을 입력하세요..."
              />
              <SendBtn onClick={handleCreateComment}>게시</SendBtn>
            </CommentInputBox>
          </CommentSheet>
        </CommentOverlay>
      )}
    </>
  );
};

/* =========================
 * styled-components
 ========================= */
const Container = styled.div`
  min-height: 100vh;
  background: #000;
`;

const ReelsContainer = styled.div`
  height: 100vh;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
`;

const ReelWrapper = styled.div`
  height: 100vh;
  scroll-snap-align: start;
`;

const VideoContainer = styled.div`
  position: relative;
  height: 100%;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const OverlayUI = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  > * {
    pointer-events: auto;
  }
`;

const ReelInfo = styled.div`
  position: absolute;
  bottom: 80px;
  left: 16px;
`;

const UserInfo = styled.div`
  display: flex;
  gap: 10px;
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  background: #fff;
  border-radius: 50%;
`;

const Username = styled.span`
  color: #fff;
`;

const Caption = styled.p`
  color: #fff;
`;

const Actions = styled.div`
  position: absolute;
  right: 12px;
  bottom: 120px;
`;

const ActionButton = styled.button`
  color: #fff;
`;

const ActionText = styled.span`
  color: #fff;
`;

const VolumeButtonWrapper = styled.div`
  position: relative;
`;

const VolumeSlider = styled.input`
  position: absolute;
  right: 60px;
`;

const CommentOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
`;

const CommentSheet = styled.div`
  background: #111;
  height: 65vh;
`;

const CommentHeader = styled.div`
  color: #fff;
  text-align: center;
`;

const CommentList = styled.div`
  flex: 1;
`;

const CommentItem = styled.div`
  display: flex;
  gap: 10px;
`;

const AvatarImg = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
`;

const CommentInputBox = styled.div`
  display: flex;
`;

const CommentInput = styled.input`
  flex: 1;
`;

const SendBtn = styled.button`
  color: #4da3ff;
`;

const EmptyText = styled.p`
  color: #aaa;
`;

const Time = styled.div`
  font-size: 12px;
  color: #999;
`;

export default Reels;
