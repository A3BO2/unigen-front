import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { Heart, MessageCircle, Send, MoreHorizontal, Plus } from "lucide-react";
import LeftSidebar from "../../components/normal/LeftSidebar";
import RightSidebar from "../../components/normal/RightSidebar";
import BottomNav from "../../components/normal/BottomNav";
import { useApp } from "../../context/AppContext";
import { getPosts } from "../../services/post";

const Home = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useApp();
  const [posts, setPosts] = useState([]);
  const [showComments, setShowComments] = useState(null);

  // 시간 차이를 계산하는 헬퍼 함수
  const getTimeAgo = (createdAt) => {
    const now = new Date();
    const postDate = new Date(createdAt);
    const diffMs = now - postDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${diffDays}일 전`;
  };

  // 포스트 데이터 불러오기
  useEffect(() => {
    getPosts().then((data) => {
      // API 데이터를 posts 형식으로 변환
      const transformedPosts = data.items.map((item) => ({
        id: item.id,
        user: {
          name: item.author.name,
          avatar: item.author.profileImageUrl,
        },
        image: item.imageUrl,
        likes: item.likeCount,
        caption: item.content,
        timestamp: getTimeAgo(item.createdAt),
        liked: false,
        comments: item.commentCount,
      }));

      setPosts(transformedPosts);
    });
  }, []);

  const handleLike = (postId) => {
    setPosts(
      posts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            liked: !post.liked,
            likes: post.liked ? post.likes - 1 : post.likes + 1,
          };
        }
        return post;
      })
    );
  };

  return (
    <>
      <LeftSidebar />
      <RightSidebar />
      <BottomNav />

      <Container $darkMode={isDarkMode}>
        <MobileHeader $darkMode={isDarkMode}>
          <LogoImage
            src={isDarkMode ? "/unigen_white.png" : "/unigen_black.png"}
            alt="Unigen"
          />
          <MobileIcons>
            <IconButton>
              <Heart size={24} />
            </IconButton>
          </MobileIcons>
        </MobileHeader>

        <MainContent>
          <Stories $darkMode={isDarkMode}>
            <Story onClick={() => navigate("/normal/story-create")}>
              <StoryAvatar>
                <MyStoryRing>
                  <span>👤</span>
                  <AddStoryButton>
                    <Plus size={16} strokeWidth={3} />
                  </AddStoryButton>
                </MyStoryRing>
              </StoryAvatar>
              <StoryName $darkMode={isDarkMode}>내 스토리</StoryName>
            </Story>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <Story key={i}>
                <StoryAvatar>
                  <StoryRing>
                    <span>{i % 2 === 0 ? "👵" : "👴"}</span>
                  </StoryRing>
                </StoryAvatar>
                <StoryName $darkMode={isDarkMode}>사용자{i}</StoryName>
              </Story>
            ))}
          </Stories>

          <Feed>
            {posts.map((post) => (
              <Post key={post.id} $darkMode={isDarkMode}>
                <PostHeader>
                  <UserInfo>
                    <Avatar>{post.user.avatar}</Avatar>
                    <Username $darkMode={isDarkMode}>{post.user.name}</Username>
                  </UserInfo>
                  <MoreButton $darkMode={isDarkMode}>
                    <MoreHorizontal size={24} />
                  </MoreButton>
                </PostHeader>

                <PostImage
                  src={post.image}
                  alt=""
                  onDoubleClick={() => handleLike(post.id)}
                />

                <PostActions>
                  <LeftActions>
                    <ActionButton
                      onClick={() => handleLike(post.id)}
                      $liked={post.liked}
                      $darkMode={isDarkMode}
                    >
                      <Heart
                        size={24}
                        fill={post.liked ? "#ed4956" : "none"}
                        color={
                          post.liked
                            ? "#ed4956"
                            : isDarkMode
                            ? "#fff"
                            : "#262626"
                        }
                        strokeWidth={post.liked ? 2 : 1.5}
                      />
                    </ActionButton>
                    <ActionButton $darkMode={isDarkMode}>
                      <MessageCircle size={24} strokeWidth={1.5} />
                    </ActionButton>
                    <ActionButton $darkMode={isDarkMode}>
                      <Send size={24} strokeWidth={1.5} />
                    </ActionButton>
                  </LeftActions>
                </PostActions>

                <PostInfo>
                  <Likes $darkMode={isDarkMode}>
                    좋아요 {post.likes.toLocaleString()}개
                  </Likes>
                  <Caption $darkMode={isDarkMode}>
                    <Username $darkMode={isDarkMode}>{post.user.name}</Username>{" "}
                    {post.caption}
                  </Caption>
                  <Comments
                    $darkMode={isDarkMode}
                    onClick={() => setShowComments(post.id)}
                  >
                    댓글 12개 모두 보기
                  </Comments>
                  <Timestamp $darkMode={isDarkMode}>{post.timestamp}</Timestamp>
                </PostInfo>

                <CommentInput>
                  <input placeholder="댓글 달기..." />
                  <PostButton>게시</PostButton>
                </CommentInput>
              </Post>
            ))}
          </Feed>
        </MainContent>

        {showComments && (
          <CommentsOverlay onClick={() => setShowComments(null)}>
            <CommentsModal onClick={(e) => e.stopPropagation()}>
              <ModalContent>
                <ModalLeft>
                  <PostImageModal
                    src={posts.find((p) => p.id === showComments)?.image}
                    alt=""
                  />
                </ModalLeft>
                <ModalRight>
                  <ModalHeader>
                    <UserInfo>
                      <Avatar>
                        {posts.find((p) => p.id === showComments)?.user.avatar}
                      </Avatar>
                      <Username $darkMode={isDarkMode}>
                        {posts.find((p) => p.id === showComments)?.user.name}
                      </Username>
                    </UserInfo>
                  </ModalHeader>

                  <CommentsSection>
                    <CommentItem>
                      <CommentAvatar>
                        {posts.find((p) => p.id === showComments)?.user.avatar}
                      </CommentAvatar>
                      <CommentContent>
                        <CommentUsername $darkMode={isDarkMode}>
                          {posts.find((p) => p.id === showComments)?.user.name}
                        </CommentUsername>
                        <CommentText $darkMode={isDarkMode}>
                          {posts.find((p) => p.id === showComments)?.caption}
                        </CommentText>
                        <CommentTime $darkMode={isDarkMode}>
                          {posts.find((p) => p.id === showComments)?.timestamp}
                        </CommentTime>
                      </CommentContent>
                    </CommentItem>

                    <CommentItem>
                      <CommentAvatar>👴</CommentAvatar>
                      <CommentContent>
                        <CommentUsername $darkMode={isDarkMode}>
                          최할아버지
                        </CommentUsername>
                        <CommentText $darkMode={isDarkMode}>
                          정말 아름다운 사진이네요!
                        </CommentText>
                        <CommentTime $darkMode={isDarkMode}>
                          1시간 전
                        </CommentTime>
                      </CommentContent>
                    </CommentItem>

                    <CommentItem>
                      <CommentAvatar>👵</CommentAvatar>
                      <CommentContent>
                        <CommentUsername $darkMode={isDarkMode}>
                          정할머니
                        </CommentUsername>
                        <CommentText $darkMode={isDarkMode}>
                          저도 가보고 싶어요 ㅎㅎ
                        </CommentText>
                        <CommentTime $darkMode={isDarkMode}>
                          30분 전
                        </CommentTime>
                      </CommentContent>
                    </CommentItem>

                    <CommentItem>
                      <CommentAvatar>👴</CommentAvatar>
                      <CommentContent>
                        <CommentUsername $darkMode={isDarkMode}>
                          강할아버지
                        </CommentUsername>
                        <CommentText $darkMode={isDarkMode}>
                          날씨가 참 좋았겠습니다
                        </CommentText>
                        <CommentTime $darkMode={isDarkMode}>
                          15분 전
                        </CommentTime>
                      </CommentContent>
                    </CommentItem>
                  </CommentsSection>

                  <ModalActions>
                    <ActionButtons>
                      <ActionButton onClick={() => handleLike(showComments)}>
                        <Heart
                          size={24}
                          fill={
                            posts.find((p) => p.id === showComments)?.liked
                              ? "#ed4956"
                              : "none"
                          }
                          color={
                            posts.find((p) => p.id === showComments)?.liked
                              ? "#ed4956"
                              : "#262626"
                          }
                          strokeWidth={1.5}
                        />
                      </ActionButton>
                      <ActionButton>
                        <MessageCircle size={24} strokeWidth={1.5} />
                      </ActionButton>
                      <ActionButton>
                        <Send size={24} strokeWidth={1.5} />
                      </ActionButton>
                    </ActionButtons>
                    <Likes>
                      좋아요{" "}
                      {posts
                        .find((p) => p.id === showComments)
                        ?.likes.toLocaleString()}
                      개
                    </Likes>
                    <Timestamp>
                      {posts.find((p) => p.id === showComments)?.timestamp}
                    </Timestamp>
                  </ModalActions>

                  <CommentInputBox>
                    <input placeholder="댓글 달기..." />
                    <PostButton>게시</PostButton>
                  </CommentInputBox>
                </ModalRight>
              </ModalContent>
            </CommentsModal>
          </CommentsOverlay>
        )}
      </Container>
    </>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: ${(props) => (props.$darkMode ? "#000" : "#fafafa")};

  @media (min-width: 1264px) {
    margin-left: 335px;
    margin-right: 335px;
    display: flex;
    justify-content: center;
  }

  @media (max-width: 1264px) and (min-width: 768px) {
    margin-left: 72px;
  }

  @media (max-width: 767px) {
    padding-bottom: 60px;
  }
`;

const MobileHeader = styled.header`
  position: sticky;
  top: 0;
  background: ${(props) => (props.$darkMode ? "#000" : "white")};
  border-bottom: 1px solid
    ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;

  @media (min-width: 768px) {
    display: none;
  }
`;

const LogoImage = styled.img`
  height: 29px;
`;

const MobileIcons = styled.div`
  display: flex;
  gap: 16px;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.6;
  }
`;

const MainContent = styled.main`
  width: 100%;

  @media (min-width: 768px) {
    max-width: 630px;
    margin: 0 auto;
    padding-top: 30px;
  }
`;

const Stories = styled.div`
  background: ${(props) => (props.$darkMode ? "#000" : "white")};
  border: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  border-radius: 8px;
  padding: 16px 0;
  display: flex;
  gap: 18px;
  overflow-x: auto;
  overflow-y: hidden;
  margin-bottom: 24px;
  padding-left: 16px;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 767px) {
    border: none;
    border-radius: 0;
    border-bottom: 1px solid
      ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
    margin-bottom: 0;
    padding: 16px 0 16px 12px;
  }
`;

const Story = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 64px;
  cursor: pointer;

  &:hover {
    opacity: 0.7;
  }
`;

const StoryAvatar = styled.div`
  margin-bottom: 6px;
  position: relative;
`;

const StoryRing = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(
    45deg,
    #f09433 0%,
    #e6683c 25%,
    #dc2743 50%,
    #cc2366 75%,
    #bc1888 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  cursor: pointer;
  position: relative;

  &::after {
    content: "";
    width: 52px;
    height: 52px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  span {
    position: relative;
    z-index: 1;
    font-size: 24px;
  }
`;

const MyStoryRing = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #fafafa;
  border: 1px solid #dbdbdb;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;

  span {
    font-size: 24px;
  }

  &:hover {
    opacity: 0.8;
  }
`;

const AddStoryButton = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #0095f6;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  svg {
    color: white;
  }

  &:hover {
    background: #1877f2;
  }
`;

const StoryName = styled.span`
  font-size: 12px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  max-width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Feed = styled.div`
  width: 100%;
`;

const Post = styled.article`
  background: ${(props) => (props.$darkMode ? "#000" : "white")};
  border: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  border-radius: 8px;
  margin-bottom: 20px;

  @media (max-width: 767px) {
    border-left: none;
    border-right: none;
    border-radius: 0;
    margin-bottom: 0;
    border-bottom: none;
  }
`;

const PostHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 4px 8px 16px;
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

const Username = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  transition: opacity 0.2s;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;

  &:hover ${Username} {
    opacity: 0.5;
  }
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: #fafafa;
  border: 1px solid #dbdbdb;
`;

const PostImage = styled.img`
  width: 100%;
  height: auto;
  display: block;
  cursor: pointer;

  @media (min-width: 768px) {
    max-height: 600px;
    object-fit: cover;
  }
`;

const PostActions = styled.div`
  display: flex;
  justify-content: flex-start;
  padding: 4px 16px 0;
`;

const LeftActions = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
`;

const likeAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
`;

const ActionButton = styled.button`
  padding: 8px 8px 8px 0;
  cursor: pointer;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  outline: none;
  border: none;
  background: transparent;

  &:hover {
    opacity: 0.5;
  }

  &:active {
    transform: scale(0.9);
  }

  ${(props) =>
    props.$liked &&
    `
    animation: ${likeAnimation} 0.4s ease;
  `}

  svg {
    color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  }
`;

const PostInfo = styled.div`
  padding: 0 16px 8px;
`;

const Likes = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  margin: 8px 0;
  cursor: pointer;

  &:hover {
    opacity: 0.5;
  }
`;

const Caption = styled.p`
  font-size: 14px;
  margin-bottom: 2px;
  line-height: 18px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};

  ${Username} {
    margin-right: 4px;
  }
`;

const Comments = styled.div`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#a8a8a8" : "#8e8e8e")};
  margin: 4px 0 2px;
  cursor: pointer;

  &:hover {
    opacity: 0.5;
  }
`;

const Timestamp = styled.div`
  font-size: 10px;
  color: ${(props) => (props.$darkMode ? "#a8a8a8" : "#8e8e8e")};
  letter-spacing: 0.2px;
  margin-top: 8px;
  text-transform: uppercase;
`;

const CommentInput = styled.div`
  border-top: 1px solid #efefef;
  padding: 6px 16px;
  display: flex;
  align-items: center;
  min-height: 56px;

  input {
    flex: 1;
    font-size: 14px;
    background: transparent;
    color: #262626;

    &::placeholder {
      color: #8e8e8e;
    }
  }
`;

const PostButton = styled.button`
  color: #0095f6;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #00376b;
  }

  &:active {
    opacity: 0.5;
  }
`;

const CommentsOverlay = styled.div`
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

const CommentsModal = styled.div`
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
  border-left: 1px solid #dbdbdb;

  @media (max-width: 767px) {
    border-left: none;
    border-top: 1px solid #dbdbdb;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #efefef;
`;

const CloseButton = styled.button`
  padding: 8px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.5;
  }

  svg {
    color: #262626;
  }
`;

const CommentsSection = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
`;

const CommentItem = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
`;

const CommentAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: #fafafa;
  border: 1px solid #dbdbdb;
  flex-shrink: 0;
`;

const CommentContent = styled.div`
  flex: 1;
`;

const CommentUsername = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  margin-right: 8px;
`;

const CommentText = styled.span`
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  line-height: 18px;
`;

const CommentTime = styled.div`
  font-size: 12px;
  color: ${(props) => (props.$darkMode ? "#a8a8a8" : "#8e8e8e")};
  margin-top: 8px;
`;

const ModalActions = styled.div`
  border-top: 1px solid #efefef;
  padding: 8px 16px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
`;

const CommentInputBox = styled.div`
  border-top: 1px solid #efefef;
  padding: 6px 16px;
  display: flex;
  align-items: center;
  min-height: 56px;

  input {
    flex: 1;
    font-size: 14px;
    background: transparent;
    color: #262626;

    &::placeholder {
      color: #8e8e8e;
    }
  }
`;

export default Home;
