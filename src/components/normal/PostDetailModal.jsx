import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Heart, MessageCircle, MoreHorizontal, X } from "lucide-react";
import {
  fetchComments,
  createComment,
  deleteComment,
} from "../../services/comment";
import { formatRelativeTime } from "../../utils/timeFormat";

const PostDetailModal = ({
  post,
  isOpen,
  onClose,
  isDarkMode,
  user: userProp,
  onLike,
  onFollow,
  onUpdate,
  onDelete,
  isFollowing: isFollowingProp,
  isMine: isMineProp,
  followLoading: followLoadingProp,
  getImageUrl,
}) => {
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [activateMenuPostId, setActivateMenuPostId] = useState(null);
  const [isLiked, setIsLiked] = useState(post?.liked || false);
  const [likesCount, setLikesCount] = useState(post?.likes || 0);

  // 이미지 URL 변환 함수
  const resolveImageUrl = (url) => {
    if (!url) return null;
    if (getImageUrl) return getImageUrl(url);
    if (url.startsWith("http")) return url;
    return url;
  };

  // 댓글 로드
  useEffect(() => {
    if (!isOpen || !post?.id) return;

    const loadComments = async () => {
      setCommentLoading(true);
      try {
        const res = await fetchComments(post.id);
        setComments(res.comments || []);
      } catch (e) {
        console.error("댓글 불러오기 실패", e);
        setComments([]);
      } finally {
        setCommentLoading(false);
      }
    };

    loadComments();
  }, [isOpen, post?.id]);

  // 좋아요 상태 동기화
  useEffect(() => {
    if (post) {
      setIsLiked(post.liked || false);
      setLikesCount(post.likes || post.like_count || 0);
    }
  }, [post]);

  // 모달 열릴 때 body 스크롤 막기/풀기
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = () => {
      setActivateMenuPostId(null);
    };

    if (activateMenuPostId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [activateMenuPostId]);

  const handleLike = () => {
    if (onLike && post?.id) {
      // Optimistic update
      setIsLiked(!isLiked);
      setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
      onLike(post.id);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentInput.trim() || !post?.id) return;

    try {
      await createComment(post.id, commentInput.trim());
      const res = await fetchComments(post.id);
      setComments(res.comments || []);
      setCommentInput("");
    } catch (e) {
      console.error("댓글 작성 실패", e);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("댓글을 삭제할까요?")) return;

    try {
      await deleteComment(commentId);
      const res = await fetchComments(post.id);
      setComments(res.comments || []);
    } catch (e) {
      console.error("댓글 삭제 실패", e);
    }
  };

  if (!isOpen || !post) return null;

  const postImage = resolveImageUrl(
    post.image || post.image_url || post.imageUrl
  );
  const postCaption = post.caption || post.content || "";
  const postTime = formatRelativeTime(post.timestamp || post.createdAt || "");
  const postLikes = likesCount;

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        {/* X 버튼 - 모달 밖 */}
        <CloseButton onClick={onClose} $darkMode={isDarkMode}>
          <X size={24} />
        </CloseButton>

        <ModalContent>
          {/* 왼쪽: 이미지 영역 */}
          <ModalLeft>
            {postImage && <PostImageModal src={postImage} alt="post" />}
          </ModalLeft>

          {/* 오른쪽: 헤더 + 댓글(본문) + 입력창 */}
          <ModalRight $darkMode={isDarkMode}>
            {/* 1. 모달 헤더 */}
            <ModalHeader $darkMode={isDarkMode}>
              <UserInfo
                onClick={() => {
                  if (post.user?.id && userProp) {
                    navigate(
                      post.user.id === userProp.id
                        ? "/normal/profile"
                        : `/normal/profile/${post.user.id}`
                    );
                  }
                }}
                style={{ cursor: post.user?.id ? "pointer" : "default" }}
              >
                <Avatar>
                  {post.user?.avatar || post.user?.profile_image ? (
                    <img
                      src={resolveImageUrl(
                        post.user.avatar || post.user.profile_image
                      )}
                      alt={post.user?.username || "User"}
                    />
                  ) : (
                    "👤"
                  )}
                </Avatar>
                <Username $darkMode={isDarkMode}>
                  {post.user?.username || "사용자"}
                </Username>

                {/* 팔로우 버튼 (내 글 아닐 때만) */}
                {!isMineProp && !followLoadingProp && (
                  <FollowButton
                    onClick={onFollow}
                    $isFollowing={isFollowingProp}
                    disabled={followLoadingProp}
                  >
                    {followLoadingProp
                      ? "..."
                      : isFollowingProp
                      ? "팔로잉"
                      : "팔로우"}
                  </FollowButton>
                )}
              </UserInfo>

              {/* 내 글일 때만 수정/삭제 메뉴 표시 */}
              {isMineProp && (
                <div style={{ position: "relative" }}>
                  <MoreButton
                    $darkMode={isDarkMode}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivateMenuPostId(
                        activateMenuPostId === post.id ? null : post.id
                      );
                    }}
                  >
                    <MoreHorizontal size={24} />
                  </MoreButton>

                  {/* 드롭다운 메뉴 */}
                  {activateMenuPostId === post.id && (
                    <>
                      <MenuOverlay
                        onClick={() => setActivateMenuPostId(null)}
                      />
                      <DropdownMenu $darkMode={isDarkMode}>
                        <MenuItem
                          onClick={() => {
                            if (onUpdate) onUpdate(post);
                            setActivateMenuPostId(null);
                          }}
                          $darkMode={isDarkMode}
                        >
                          수정
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            if (onDelete) onDelete(post.id);
                            setActivateMenuPostId(null);
                          }}
                          $darkMode={isDarkMode}
                          $danger
                        >
                          삭제
                        </MenuItem>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              )}
            </ModalHeader>

            {/* 2. 댓글 목록 섹션 */}
            <CommentsSection $darkMode={isDarkMode}>
              {/* 게시물 본문(Caption)을 첫 번째 댓글처럼 표시 */}
              <CommentItem>
                <CommentAvatar>
                  {post.user?.avatar || post.user?.profile_image ? (
                    <img
                      src={resolveImageUrl(
                        post.user.avatar || post.user.profile_image
                      )}
                      alt={post.user?.username || "User"}
                    />
                  ) : (
                    "👤"
                  )}
                </CommentAvatar>
                <CommentContent>
                  <CommentUsername $darkMode={isDarkMode}>
                    {post.user?.username || "사용자"}
                  </CommentUsername>
                  <CommentText $darkMode={isDarkMode}>
                    {postCaption}
                  </CommentText>
                  <CommentTime $darkMode={isDarkMode}>
                    {postTime || ""}
                  </CommentTime>
                </CommentContent>
              </CommentItem>

              {commentLoading ? (
                <CommentText $darkMode={isDarkMode}>불러오는 중...</CommentText>
              ) : comments.length === 0 ? (
                <CommentText $darkMode={isDarkMode}>
                  첫 댓글을 남겨보세요
                </CommentText>
              ) : (
                comments.map((c) => {
                  const isMineComment = userProp && c.user?.id === userProp.id;

                  return (
                    <CommentItem key={c.id}>
                      <CommentAvatar
                        onClick={(e) => {
                          e.stopPropagation();
                          if (c.user?.id && userProp) {
                            navigate(
                              c.user.id === userProp.id
                                ? "/normal/profile"
                                : `/normal/profile/${c.user.id}`
                            );
                          }
                        }}
                        style={{
                          cursor: c.user?.id ? "pointer" : "default",
                        }}
                      >
                        {c.user?.avatar ? (
                          <img
                            src={resolveImageUrl(c.user.avatar)}
                            alt={c.user.username}
                          />
                        ) : (
                          "👤"
                        )}
                      </CommentAvatar>

                      <CommentContent>
                        <CommentHeader>
                          <CommentUsername
                            $darkMode={isDarkMode}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (c.user?.id && userProp) {
                                navigate(
                                  c.user.id === userProp.id
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
                          {isMineComment && (
                            <DeleteBtn
                              onClick={() => handleDeleteComment(c.id)}
                            >
                              삭제
                            </DeleteBtn>
                          )}
                        </CommentHeader>
                        <CommentText $darkMode={isDarkMode}>
                          {c.text || c.content}
                        </CommentText>
                        <CommentTime $darkMode={isDarkMode}>
                          {formatRelativeTime(
                            c.time || c.timestamp || c.createdAt || ""
                          )}
                        </CommentTime>
                      </CommentContent>
                    </CommentItem>
                  );
                })
              )}
            </CommentsSection>

            {/* 3. 하단 액션 버튼 (좋아요 등) */}
            <ModalActions>
              <ActionButtons>
                <ActionButton onClick={handleLike}>
                  <Heart
                    size={24}
                    fill={isLiked ? "#ed4956" : "none"}
                    color={
                      isLiked ? "#ed4956" : isDarkMode ? "#fff" : "#262626"
                    }
                    strokeWidth={isLiked ? 2 : 1.5}
                  />
                </ActionButton>
                <ActionButton>
                  <MessageCircle
                    size={24}
                    strokeWidth={1.5}
                    color={isDarkMode ? "#fff" : "#262626"}
                  />
                </ActionButton>
              </ActionButtons>
              <Likes $darkMode={isDarkMode}>
                좋아요 {postLikes.toLocaleString()}개
              </Likes>
              <Timestamp $darkMode={isDarkMode}>{postTime || ""}</Timestamp>
            </ModalActions>

            {/* 4. 댓글 입력창 */}
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
                    handleCommentSubmit();
                  }
                }}
                placeholder="댓글 달기..."
              />
              <PostButton
                onClick={handleCommentSubmit}
                disabled={!commentInput.trim()}
              >
                게시
              </PostButton>
            </CommentInputBox>
          </ModalRight>
        </ModalContent>
      </ModalContainer>
    </Overlay>
  );
};

export default PostDetailModal;

// Styled Components
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContainer = styled.div`
  position: relative;
  background: white;
  border-radius: 4px;
  width: 90%;
  max-width: 1000px;
  height: 85vh;
  max-height: 800px;
  display: flex;
  overflow: hidden;

  @media (max-width: 767px) {
    width: 100%;
    height: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
`;

const CloseButton = styled.button`
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 8px;
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  border-radius: 50%;
  width: 40px;
  height: 40px;

  &:hover {
    opacity: 0.7;
    background: rgba(0, 0, 0, 0.7);
  }

  @media (max-width: 767px) {
    top: 10px;
    right: 10px;
  }
`;

const ModalContent = styled.div`
  display: flex;
  width: 100%;
  height: 100%;

  @media (max-width: 767px) {
    flex-direction: column;
  }
`;

const ModalLeft = styled.div`
  flex: 1.3;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 767px) {
    flex: none;
    height: 50%;
  }
`;

const PostImageModal = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const ModalRight = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  border-left: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};

  @media (max-width: 767px) {
    border-left: none;
    border-top: 1px solid
      ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid
    ${(props) => (props.$darkMode ? "#363636" : "#efefef")};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
`;

const Avatar = styled.div`
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

const Username = styled.span`
  font-weight: 600;
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

const MoreButton = styled.button`
  padding: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
  outline: none;
  border: none;
  background: transparent;

  &:hover {
    opacity: 0.5;
  }

  svg {
    color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  }
`;

const MenuOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  cursor: default;
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background: ${(props) => (props.$darkMode ? "#262626" : "white")};
  border: 1px solid ${(props) => (props.$darkMode ? "#555" : "#dbdbdb")};
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 100px;
  z-index: 1001;
  overflow: hidden;
`;

const MenuItem = styled.button`
  width: 100%;
  padding: 10px;
  text-align: center;
  font-size: 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  border-bottom: 1px solid ${(props) => (props.$darkMode ? "#333" : "#f0f0f0")};
  color: ${(props) =>
    props.$danger ? "#ed4956" : props.$darkMode ? "#fff" : "#262626"};
  font-weight: ${(props) => (props.$danger ? "700" : "400")};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${(props) => (props.$darkMode ? "#333" : "#fafafa")};
  }
`;

const CommentsSection = styled.div`
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

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const CommentUsername = styled.span`
  font-weight: 600;
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  flex-shrink: 0;
`;

const CommentText = styled.span`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  word-break: break-word;
  display: block;
  line-height: 1.4;
  white-space: pre-wrap;
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
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  font-weight: 600;

  &:hover {
    text-decoration: underline;
    opacity: 0.8;
  }

  &:active {
    opacity: 0.6;
  }
`;

const ModalActions = styled.div`
  padding: 12px 16px;
  border-top: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  border-bottom: 1px solid
    ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
`;

const ActionButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    opacity: 0.7;
  }
`;

const Likes = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  margin-bottom: 8px;
`;

const Timestamp = styled.div`
  font-size: 12px;
  color: ${(props) => (props.$darkMode ? "#8e8e8e" : "#8e8e8e")};
  text-transform: uppercase;
`;

const CommentInputBox = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  gap: 12px;
`;

const CommentInputIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
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
