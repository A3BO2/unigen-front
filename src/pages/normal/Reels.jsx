import { useEffect, useRef, useState, useCallback } from "react";
import styled from "styled-components";
import { useSearchParams, useNavigate } from "react-router-dom";
import LeftSidebar from "../../components/normal/LeftSidebar";
import BottomNav from "../../components/normal/BottomNav";
import { Heart, MessageCircle, Volume2, VolumeX } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { isFollowing, followUser, unfollowUser } from "../../services/user";

// ✅ 댓글 API 서비스 import
import {
  fetchComments,
  createComment,
  deleteComment,
} from "../../services/comment";

import { getReel, likePost, unlikePost, isPostLike } from "../../services/post";

const Reels = () => {
  /* =========================
   * 상태 
   ========================= */
  const { user: currentUser, isDarkMode } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startId = searchParams.get("startId"); // 탐색탭에서 넘어온 릴스 ID

  const [reels, setReels] = useState([]);
  const cursorRef = useRef(null); // cursor ref for useCallback
  const loadingRef = useRef(false); // ref로 추적 (비동기 체크용)
  const noMoreReelsRef = useRef(false); // ref로도 추적 (비동기 체크용)
  const [initialLoaded, setInitialLoaded] = useState(false);

  // 팔로우 상태 관리
  const [followStatuses, setFollowStatuses] = useState({}); // { reelId: { isFollowing: boolean, isLoading: boolean } }

  const FILE_BASE_URL = import.meta.env.VITE_BASE_URL;

  // 🔊 전역 볼륨(원하면 릴스별로도 가능하지만 일단 전역 유지)
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0); // 0 ~ 1

  // ✅ “볼륨 UI 열림”은 현재 릴스 하나만 열리게
  const [openVolumeReelId, setOpenVolumeReelId] = useState(null);

  // ✅ video DOM들을 잡아서 volume/muted를 실제 엘리먼트에 동기화
  const videoRefs = useRef({}); // { [reelId]: HTMLVideoElement }

  const [showComments, setShowComments] = useState(null); // postId | null
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const myUser = JSON.parse(sessionStorage.getItem("user"));

  const resolveUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url; // ✅ S3
    return `${FILE_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  /* =========================
   * 릴스 가져오기
   ========================= */
  const fetchReel = useCallback(
    async (targetId = null) => {
      // noMoreReels 체크는 ref로 확인 (비동기 처리 시 state는 업데이트되지 않을 수 있음)
      if (loadingRef.current) return;
      if (noMoreReelsRef.current) return;
      loadingRef.current = true;

      try {
        // targetId가 있으면 그 기준으로, 없으면 cursor 기준
        const data = await getReel(targetId ?? cursorRef.current);

        if (!data?.reel || data?.message === "NO_MORE_REELS") {
          noMoreReelsRef.current = true;
          loadingRef.current = false;
          return;
        }

        const reel = data.reel;

        setReels((prev) => {
          if (prev.some((r) => r.id === reel.id)) return prev;

          return [
            ...prev,
            {
              id: reel.id,
              video: resolveUrl(reel.video_url),
              thumbnail: resolveUrl(reel.image_url), // 썸네일 용도 (poster)

              user: {
                id: reel.author_id,
                username: reel.authorName || "알 수 없음",
                avatar: reel.authorProfile ? (
                  <img
                    src={resolveUrl(reel.authorProfile)}
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
        // ✅ 좋아요 상태 조회 (UI 영향 없음)
        try {
          const likeRes = await isPostLike(reel.id);
          setReels((prev) =>
            prev.map((r) =>
              r.id === reel.id ? { ...r, liked: likeRes.isLiked } : r
            )
          );
        } catch (e) {
          console.error("좋아요 상태 조회 실패", e);
        }

        // ⭐ 안전장치(서버가 같은 cursor를 주면 무한루프 방지)
        if (data.nextCursor === cursorRef.current) {
          noMoreReelsRef.current = true;
          loadingRef.current = false;
          return;
        }

        cursorRef.current = data.nextCursor;
      } catch (error) {
        console.error(error);
      } finally {
        loadingRef.current = false;
      }
    },
    [] // dependency 제거 (ref 사용)
  );
  /* =========================
   * 댓글 불러오기
   ========================= */

  useEffect(() => {
    if (!showComments) return;

    const loadComments = async () => {
      setCommentLoading(true);
      try {
        const res = await fetchComments(showComments);
        setComments(res.comments); // ✅ 여기
      } catch (err) {
        console.error("댓글 불러오기 실패", err);
      } finally {
        setCommentLoading(false);
      }
    };

    loadComments();
  }, [showComments]);

  // 팔로우 상태 확인
  useEffect(() => {
    const checkFollowStatuses = async () => {
      for (const reel of reels) {
        if (!reel.user?.id || reel.user.id === currentUser?.id) continue;

        // 이미 확인했으면 스킵
        if (followStatuses[reel.id] !== undefined) continue;

        try {
          const response = await isFollowing(reel.user.id);
          setFollowStatuses((prev) => ({
            ...prev,
            [reel.id]: {
              isFollowing: Boolean(response?.isFollowing),
              isLoading: false,
            },
          }));
        } catch (error) {
          console.error("팔로우 상태 확인 실패:", error);
          setFollowStatuses((prev) => ({
            ...prev,
            [reel.id]: {
              isFollowing: false,
              isLoading: false,
            },
          }));
        }
      }
    };

    checkFollowStatuses();
  }, [reels, currentUser?.id]);

  // 팔로우/언팔로우 핸들러
  const handleFollow = async (reelId, userId) => {
    if (!userId || followStatuses[reelId]?.isLoading) return;

    setFollowStatuses((prev) => ({
      ...prev,
      [reelId]: {
        ...prev[reelId],
        isLoading: true,
      },
    }));

    try {
      const currentStatus = followStatuses[reelId]?.isFollowing;
      if (currentStatus) {
        await unfollowUser(userId);
        setFollowStatuses((prev) => ({
          ...prev,
          [reelId]: {
            isFollowing: false,
            isLoading: false,
          },
        }));
      } else {
        await followUser(userId);
        setFollowStatuses((prev) => ({
          ...prev,
          [reelId]: {
            isFollowing: true,
            isLoading: false,
          },
        }));
      }
    } catch (error) {
      console.error("팔로우/언팔로우 요청 실패:", error);
      setFollowStatuses((prev) => ({
        ...prev,
        [reelId]: {
          ...prev[reelId],
          isLoading: false,
        },
      }));
    }
  };

  /* =========================
   * 최초 로딩: startId 우선 적용, 초기에 여러 개 가져오기
   ========================= */
  useEffect(() => {
    // ✅ startId가 있으면 그 릴스로부터 시작
    // (백엔드가 id < lastId 방식이면, startId를 "커서"로 넣으면 startId보다 작은 것부터 나오기 때문에
    // startId를 정확히 포함하고 싶으면 서버에서 startId fetch 전용을 만들거나,
    // 현재 구조라면 startId+1을 주는 방식이 보통 안정적)
    const init = async () => {
      if (initialLoaded) return;

      // 초기 로딩 시 여러 개의 릴스를 가져오기 (10개)
      const initialLoadCount = 10;

      if (startId) {
        const s = Number(startId);
        if (Number.isFinite(s) && s > 0) {
          // startId가 있으면 해당 릴스부터 시작
          for (let i = 0; i < initialLoadCount; i++) {
            await fetchReel(i === 0 ? s + 1 : undefined);
            // 더 이상 릴스가 없으면 중단
            if (noMoreReelsRef.current) break;
            // 각 요청 사이에 약간의 지연 (서버 부하 방지)
            if (i < initialLoadCount - 1) {
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
          }
        } else {
          // startId가 없으면 처음부터
          for (let i = 0; i < initialLoadCount; i++) {
            await fetchReel();
            if (noMoreReelsRef.current) break;
            if (i < initialLoadCount - 1) {
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
          }
        }
      } else {
        // startId가 없으면 처음부터
        for (let i = 0; i < initialLoadCount; i++) {
          await fetchReel();
          if (noMoreReelsRef.current) break;
          if (i < initialLoadCount - 1) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }
      }

      setInitialLoaded(true);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startId, initialLoaded]);

  /* =========================
   * 무한 스크롤 및 영상 재생/일시정지 관리
   ========================= */
  useEffect(() => {
    if (reels.length === 0) return;

    const reelsContainer = document.querySelector("[data-reels-container]");
    if (!reelsContainer) return;

    // 모든 릴스에 대해 IntersectionObserver 설정
    const observers = [];

    reels.forEach((reel) => {
      const videoElement = videoRefs.current[reel.id];
      if (!videoElement) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const currentVideo = videoRefs.current[reel.id];
            if (!currentVideo) return;

            if (entry.isIntersecting) {
              // 영상이 보일 때 재생
              currentVideo.play().catch(() => {});
            } else {
              // 영상이 안 보일 때 일시정지하고 처음으로 돌아가기
              currentVideo.pause();
              currentVideo.currentTime = 0;
            }
          });
        },
        {
          root: reelsContainer, // 스크롤 컨테이너를 root로 지정
          threshold: 0.5, // 영상의 50% 이상이 보일 때 활성화
        }
      );

      observer.observe(videoElement);
      observers.push(observer);
    });

    // 마지막 릴스 관찰 (무한 스크롤용)
    const lastReel = document.querySelector(
      `[data-reel-id="${reels[reels.length - 1].id}"]`
    );
    if (lastReel) {
      const loadObserver = new IntersectionObserver(
        ([entry]) => {
          if (
            entry.isIntersecting &&
            !loadingRef.current &&
            !noMoreReelsRef.current
          ) {
            fetchReel();
          }
        },
        {
          root: reelsContainer,
          threshold: 0.6,
        }
      );

      loadObserver.observe(lastReel);
      observers.push(loadObserver);
    }

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [reels, fetchReel]);

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
  const handleLike = async (reelId) => {
    const target = reels.find((r) => r.id === reelId);
    if (!target) return;

    // optimistic update
    setReels((prev) =>
      prev.map((r) =>
        r.id === reelId
          ? {
              ...r,
              liked: !r.liked,
              likes: r.liked ? r.likes - 1 : r.likes + 1,
            }
          : r
      )
    );

    try {
      if (target.liked) {
        await unlikePost(reelId);
      } else {
        await likePost(reelId);
      }
    } catch (err) {
      console.error("좋아요 실패 → 롤백", err);

      // 롤백
      setReels((prev) =>
        prev.map((r) =>
          r.id === reelId
            ? {
                ...r,
                liked: target.liked,
                likes: target.likes,
              }
            : r
        )
      );
    }
  };

  const handleCreateComment = async () => {
    if (!commentInput.trim()) return;

    try {
      await createComment(showComments, commentInput);

      // ✅ 서버를 단일 진실 소스로 다시 fetch
      const res = await fetchComments(showComments);
      setComments(res.comments);

      setReels((prev) =>
        prev.map((r) =>
          r.id === showComments ? { ...r, comments: r.comments + 1 } : r
        )
      );

      setCommentInput("");
    } catch (err) {
      console.error("댓글 작성 실패", err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("댓글을 삭제할까요?")) return;

    try {
      await deleteComment(commentId);

      // 댓글 목록 갱신
      const res = await fetchComments(showComments);
      setComments(res.comments);

      // 릴 댓글 수 감소
      setReels((prev) =>
        prev.map((r) =>
          r.id === showComments
            ? { ...r, comments: Math.max(0, r.comments - 1) }
            : r
        )
      );
    } catch (err) {
      console.error("댓글 삭제 실패", err);
    }
  };

  return (
    <>
      <LeftSidebar />
      <BottomNav />

      <Container>
        <ReelsContainer data-reels-container>
          {reels.map((reel) => {
            const isOpen = openVolumeReelId === reel.id;

            return (
              <ReelWrapper key={reel.id} data-reel-id={reel.id}>
                <VideoContainer>
                  {/* ✅ 영상 / 이미지 분기 */}
                  {reel.video && (
                    <Video
                      src={reel.video}
                      poster={reel.thumbnail} // ⭐ 썸네일
                      loop
                      muted={muted}
                      playsInline
                      onClick={togglePlay}
                      onError={() =>
                        console.error("❌ 영상 로드 실패:", reel.video)
                      }
                      ref={(el) => {
                        if (!el) return;
                        videoRefs.current[reel.id] = el;
                        el.muted = muted;
                        el.volume = muted ? 0 : volume;
                      }}
                    />
                  )}

                  <OverlayUI>
                    <ReelInfo>
                      <UserInfo
                        onClick={(e) => {
                          e.stopPropagation();
                          if (reel.user?.id) {
                            navigate(
                              reel.user.id === currentUser?.id
                                ? "/normal/profile"
                                : `/normal/profile/${reel.user.id}`
                            );
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <Avatar
                          onClick={(e) => {
                            e.stopPropagation();
                            if (reel.user?.id) {
                              navigate(
                                reel.user.id === currentUser?.id
                                  ? "/normal/profile"
                                  : `/normal/profile/${reel.user.id}`
                              );
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          {reel.user.avatar}
                        </Avatar>
                        <Username
                          onClick={(e) => {
                            e.stopPropagation();
                            if (reel.user?.id) {
                              navigate(
                                reel.user.id === currentUser?.id
                                  ? "/normal/profile"
                                  : `/normal/profile/${reel.user.id}`
                              );
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          {reel.user.username}
                        </Username>
                        {reel.user.id !== currentUser?.id && (
                          <FollowButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFollow(reel.id, reel.user.id);
                            }}
                            disabled={followStatuses[reel.id]?.isLoading}
                            $isFollowing={followStatuses[reel.id]?.isFollowing}
                          >
                            {followStatuses[reel.id]?.isLoading
                              ? "..."
                              : followStatuses[reel.id]?.isFollowing
                              ? "팔로잉"
                              : "팔로우"}
                          </FollowButton>
                        )}
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

                      <ActionButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowComments(reel.id); // 🔥 postId
                        }}
                      >
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
      {showComments && (
        <CommentOverlay
          onClick={() => setShowComments(null)}
          $darkMode={isDarkMode}
        >
          <CommentSheet
            onClick={(e) => e.stopPropagation()}
            $darkMode={isDarkMode}
          >
            <CommentHeader $darkMode={isDarkMode}>
              댓글
              <CloseBtn
                onClick={() => setShowComments(null)}
                $darkMode={isDarkMode}
              >
                ✕
              </CloseBtn>
            </CommentHeader>

            <CommentList $darkMode={isDarkMode}>
              {commentLoading ? (
                <EmptyText $darkMode={isDarkMode}>불러오는 중...</EmptyText>
              ) : comments.length === 0 ? (
                <EmptyText $darkMode={isDarkMode}>
                  첫 댓글을 남겨보세요
                </EmptyText>
              ) : (
                comments.map((c) => {
                  const isMine = myUser && c.user?.id === myUser.id;

                  return (
                    <CommentItem key={c.id}>
                      <CommentAvatar
                        $darkMode={isDarkMode}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (c.user?.id) {
                            navigate(
                              c.user.id === currentUser?.id
                                ? "/normal/profile"
                                : `/normal/profile/${c.user.id}`
                            );
                          }
                        }}
                        style={{ cursor: c.user?.id ? "pointer" : "default" }}
                      >
                        {c.user?.avatar ? (
                          <img
                            src={
                              c.user.avatar.startsWith("http")
                                ? c.user.avatar
                                : `${FILE_BASE_URL}${
                                    c.user.avatar.startsWith("/") ? "" : "/"
                                  }${c.user.avatar}`
                            }
                            alt={c.user.username}
                          />
                        ) : (
                          "👤"
                        )}
                      </CommentAvatar>

                      <CommentContent>
                        <CommentItemHeader>
                          <CommentUsername
                            $darkMode={isDarkMode}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (c.user?.id) {
                                navigate(
                                  c.user.id === currentUser?.id
                                    ? "/normal/profile"
                                    : `/normal/profile/${c.user.id}`
                                );
                              }
                            }}
                            style={{ cursor: c.user?.id ? "pointer" : "default" }}
                          >
                            {c.user?.username || "사용자"}
                          </CommentUsername>
                          {isMine && (
                            <DeleteBtn onClick={() => handleDeleteComment(c.id)}>
                              삭제
                            </DeleteBtn>
                          )}
                        </CommentItemHeader>
                        <CommentText $darkMode={isDarkMode}>
                          {c.text || c.content}
                        </CommentText>
                        <CommentTime $darkMode={isDarkMode}>
                          {c.time || ""}
                        </CommentTime>
                      </CommentContent>
                    </CommentItem>
                  );
                })
              )}
            </CommentList>

            <CommentInputBox $darkMode={isDarkMode}>
              <CommentInputIcon $darkMode={isDarkMode}>
                <MessageCircle
                  size={20}
                  fill="none"
                  stroke={isDarkMode ? "#fff" : "#262626"}
                  strokeWidth={1.5}
                />
              </CommentInputIcon>
              <StyledInput
                $darkMode={isDarkMode}
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleCreateComment();
                  }
                }}
                placeholder="댓글 달기..."
              />
              <PostButton
                onClick={handleCreateComment}
                disabled={!commentInput.trim()}
              >
                게시
              </PostButton>
            </CommentInputBox>
          </CommentSheet>
        </CommentOverlay>
      )}
    </>
  );
};

const CommentOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 3000;
  display: flex;
  align-items: flex-end;

  @media (min-width: 768px) {
    padding-left: 72px; /* LeftSidebar width */
    justify-content: center;
  }

  @media (max-width: 767px) {
    padding-left: 0;
    justify-content: center;
  }
`;

const CommentSheet = styled.div`
  width: 100%;
  max-width: 480px;
  height: 65vh;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  border-radius: 0;
  display: flex;
  flex-direction: column;
`;

const CommentHeader = styled.div`
  position: relative;
  padding: 14px;
  text-align: center;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  border-bottom: 1px solid
    ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
`;

const CloseBtn = styled.button`
  position: absolute;
  right: 14px;
  top: 10px;
  font-size: 18px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
`;

const CommentList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${(props) => (props.$darkMode ? "#363636" : "#dbdbdb")};
    border-radius: 4px;
  }
`;

const CommentItem = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
`;

const CommentAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: ${(props) => (props.$darkMode ? "#262626" : "#efefef")};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CommentContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const CommentItemHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CommentUsername = styled.span`
  font-weight: 600;
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const CommentText = styled.span`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  word-break: break-word;
  display: block;
`;

const CommentTime = styled.span`
  font-size: 12px;
  color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  display: block;
`;

const DeleteBtn = styled.button`
  background: transparent;
  border: none;
  color: #ed4956;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  margin-left: auto;

  &:hover {
    text-decoration: underline;
  }
`;

const EmptyText = styled.div`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  text-align: center;
  padding: 20px;
`;

const CommentInputBox = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  gap: 12px;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
`;

const CommentInputIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const StyledInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};

  &::placeholder {
    color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  }
`;

const PostButton = styled.button`
  background: transparent;
  border: none;
  color: #0095f6;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  padding: 0;

  &:hover:not(:disabled) {
    color: #1877f2;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const VolumeButtonWrapper = styled.div`
  position: relative; /* 🎯 기준점 */
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
  inset: 0; /* VideoContainer 전체 기준 */
  pointer-events: none; /* 기본은 터치 막기 */

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
  right: 60px; /* 🔥 아이콘 왼쪽 */
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
  cursor: pointer;
`;

const Username = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
`;

const FollowButton = styled.button`
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  background: ${(props) => (props.$isFollowing ? "#efefef" : "#0095f6")};
  color: ${(props) => (props.$isFollowing ? "#262626" : "#fff")};

  &:hover:not(:disabled) {
    background: ${(props) => (props.$isFollowing ? "#dbdbdb" : "#1877f2")};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
  bottom: 120px; /* 🔥 이 값은 이제 “영상 기준” */
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

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: black;
`;

export default Reels;
