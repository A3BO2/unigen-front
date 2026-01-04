import { useEffect, useRef, useState, useCallback } from "react";
import styled from "styled-components";
import { useSearchParams, useNavigate } from "react-router-dom";
import LeftSidebar from "../../components/normal/LeftSidebar";
import RightSidebar from "../../components/normal/RightSidebar";
import BottomNav from "../../components/normal/BottomNav";
import {
  Heart,
  MessageCircle,
  Volume2,
  VolumeX,
  ArrowLeft,
} from "lucide-react";
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
  const cursorRef = useRef(new Date().toISOString()); // cursor ref for useCallback
  const loadingRef = useRef(false); // ref로 추적 (비동기 체크용)
  const noMoreReelsRef = useRef(false); // ref로도 추적 (비동기 체크용)
  const [initialLoaded, setInitialLoaded] = useState(false);

  // 팔로우 상태 관리 (userId를 키로 사용)
  const [followStatuses, setFollowStatuses] = useState({}); // { userId: { isFollowing: boolean, isLoading: boolean } }

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
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const myUser = JSON.parse(sessionStorage.getItem("user"));

  // 해시태그 색상 처리 함수
  const renderContentWithHashtags = (content) => {
    if (!content) return null;

    const parts = content.split(/(#[가-힣a-zA-Z0-9_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("#")) {
        return (
          <Hashtag key={index} $darkMode={isDarkMode}>
            {part}
          </Hashtag>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // ✅ 페이지 진입 시 스크롤 맨 위로 초기화
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const resolveUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url; // ✅ S3
    return `${FILE_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  /* =========================
   * 릴스 가져오기
   ========================= */
  const fetchReel = useCallback(
  async (overrideCursor = null) => {
    if (loadingRef.current || noMoreReelsRef.current) return;
    loadingRef.current = true;

    try {
      const data = await getReel(
        overrideCursor ?? cursorRef.current
      );

      if (!data?.reel || data?.message === "NO_MORE_REELS") {
        noMoreReelsRef.current = true;
        return;
      }

      const reel = data.reel;

      setReels((prev) => {
        if (prev.some((r) => r.id === reel.id)) return prev;
        return [...prev, {
          id: reel.id,
          video: resolveUrl(reel.video_url),
          thumbnail: resolveUrl(reel.image_url),
          user: {
            id: reel.author_id,
            username: reel.authorName || "알 수 없음",
            avatar: reel.authorProfile
              ? <img src={resolveUrl(reel.authorProfile)} />
              : "👤",
          },
          caption: reel.content,
          likes: reel.like_count,
          comments: reel.comment_count,
          liked: false,
          isSeniorMode: reel.is_senior_mode,
          createdAt: reel.created_at,
        }];
      });

      cursorRef.current = data.nextCursor;
    } catch (e) {
      console.error(e);
    } finally {
      loadingRef.current = false;
    }
  },
  [followStatuses]
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

        // 이미 확인했으면 스킵 (userId 기준)
        if (followStatuses[reel.user.id] !== undefined) continue;

        try {
          const response = await isFollowing(reel.user.id);
          setFollowStatuses((prev) => ({
            ...prev,
            [reel.user.id]: {
              isFollowing: Boolean(response?.isFollowing),
              isLoading: false,
            },
          }));
        } catch (error) {
          console.error("팔로우 상태 확인 실패:", error);
          setFollowStatuses((prev) => ({
            ...prev,
            [reel.user.id]: {
              isFollowing: false,
              isLoading: false,
            },
          }));
        }
      }
    };

    checkFollowStatuses();
  }, [reels, currentUser?.id, followStatuses]);

  // 팔로우/언팔로우 핸들러
  const handleFollow = async (userId) => {
    if (!userId || followStatuses[userId]?.isLoading) return;

    setFollowStatuses((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        isLoading: true,
      },
    }));

    try {
      const currentStatus = followStatuses[userId]?.isFollowing;
      if (currentStatus) {
        await unfollowUser(userId);
        setFollowStatuses((prev) => ({
          ...prev,
          [userId]: {
            isFollowing: false,
            isLoading: false,
          },
        }));
      } else {
        await followUser(userId);
        setFollowStatuses((prev) => ({
          ...prev,
          [userId]: {
            isFollowing: true,
            isLoading: false,
          },
        }));
      }
    } catch (error) {
      console.error("팔로우/언팔로우 요청 실패:", error);
      setFollowStatuses((prev) => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          isLoading: false,
        },
      }));
    }
  };

  /* =========================
   * 최초 로딩: startId 우선 적용, 초기에 여러 개 가져오기
   ========================= */
  useEffect(() => {
  const init = async () => {
    if (initialLoaded) return;

    const initialLoadCount = 10;

    for (let i = 0; i < initialLoadCount; i++) {
      await fetchReel();
      if (noMoreReelsRef.current) break;
      if (i < initialLoadCount - 1) {
        await new Promise((r) => setTimeout(r, 50));
      }
    }

    setInitialLoaded(true);
  };

  init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [initialLoaded]);

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
    if (!commentInput.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
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
    } finally {
      setIsSubmittingComment(false);
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
      <RightSidebarWrapper>
        <RightSidebar />
      </RightSidebarWrapper>
      <BottomNav />

      <BackButtonContainer onClick={() => navigate(-1)}>
        <ArrowLeft size={34} color="#fff" strokeWidth={2.5} />
      </BackButtonContainer>

      <Container>
        <ReelsContainer data-reels-container>
          {initialLoaded && reels.length === 0 ? (
            <EmptyState>
              <EmptyStateContent $darkMode={isDarkMode}>
                <EmptyStateIcon>🎬</EmptyStateIcon>
                <EmptyStateTitle $darkMode={isDarkMode}>
                  릴스가 없습니다
                </EmptyStateTitle>
                <EmptyStateMessage $darkMode={isDarkMode}>
                  아직 업로드된 릴스가 없습니다.
                  <br />첫 릴스를 업로드해보세요!
                </EmptyStateMessage>
              </EmptyStateContent>
            </EmptyState>
          ) : (
            reels.map((reel) => {
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
                                handleFollow(reel.user.id);
                              }}
                              disabled={followStatuses[reel.user.id]?.isLoading}
                              $isFollowing={
                                followStatuses[reel.user.id]?.isFollowing
                              }
                            >
                              {followStatuses[reel.user.id]?.isLoading
                                ? "..."
                                : followStatuses[reel.user.id]?.isFollowing
                                ? "팔로잉"
                                : "팔로우"}
                            </FollowButton>
                          )}
                        </UserInfo>
                        <Caption>
                          {renderContentWithHashtags(reel.caption)}
                        </Caption>
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
            })
          )}
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
                            style={{
                              cursor: c.user?.id ? "pointer" : "default",
                            }}
                          >
                            {c.user?.username || "사용자"}
                          </CommentUsername>
                          {isMine && (
                            <DeleteBtn
                              onClick={() => handleDeleteComment(c.id)}
                            >
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
                    e.stopPropagation();
                    if (!isSubmittingComment) {
                      handleCreateComment();
                    }
                  }
                }}
                placeholder="댓글 달기..."
              />
              <PostButton
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCreateComment();
                }}
                disabled={!commentInput.trim() || isSubmittingComment}
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

const BackButtonContainer = styled.button`
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  width: 62px;
  height: 62px;
  min-height: 62px; /* 전역 스타일 오버라이드 */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(0, 0, 0, 0.8);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    width: 34px;
    height: 34px;
  }

  @media (min-width: 768px) {
    left: calc(72px + 20px); /* LeftSidebar 너비 + 여백 */
  }

  @media (min-width: 1265px) {
    left: calc(335px + 20px); /* LeftSidebar 너비 + 여백 */
  }
`;

const Container = styled.div`
  min-height: 100vh;
  background: #000;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (min-width: 1265px) {
    margin-left: 335px;
    margin-right: 335px;
  }

  @media (min-width: 768px) and (max-width: 1264px) {
    margin-left: 72px;
    margin-right: 0;
  }

  @media (max-width: 767px) {
    margin-left: 0;
    margin-right: 0;
    padding-bottom: 0;
    height: 100vh;
    height: 100dvh;
    min-height: 100vh;
    min-height: 100dvh;
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

  @media (max-width: 767px) {
    height: 100vh;
    height: 100dvh; /* 동적 뷰포트 높이 */
  }
`;

const ReelWrapper = styled.div`
  width: 100%;
  height: 100vh;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: start;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;

  @media (max-width: 767px) {
    height: calc(100vh - 60px); /* 하단 네비게이션 바 높이 제외 */
    height: calc(100dvh - 60px);
    min-height: calc(100vh - 60px);
    min-height: calc(100dvh - 60px);
  }
`;

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 480px;
  height: 100%;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  overflow: hidden;

  @media (min-width: 768px) and (max-width: 1024px) {
    max-width: 600px; /* 태블릿에서 더 크게 */
  }

  @media (max-width: 767px) {
    max-width: 100%;
    width: 100%;
    height: 100%;
  }
`;

const Video = styled.video`
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;

  @media (max-width: 767px) {
    max-width: 100%;
    max-height: calc(100dvh - 60px); /* 하단 네비게이션 바 높이 제외 */
  }
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

const Hashtag = styled.span`
  color: #4a9eff;
  font-weight: 600;
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
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  width: 100%;
`;

const EmptyStateContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
`;

const EmptyStateIcon = styled.div`
  font-size: 64px;
  margin-bottom: 24px;
`;

const EmptyStateTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 12px;
`;

const EmptyStateMessage = styled.p`
  font-size: 16px;
  color: #8e8e8e;
  line-height: 1.5;
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: black;
`;

const RightSidebarWrapper = styled.div`
  /* 릴스 화면에서는 다크모드 관계없이 RightSidebar가 정상 작동하도록 함 */
`;

export default Reels;
