import styled from "styled-components";
import LeftSidebar from "../../components/normal/LeftSidebar";
import RightSidebar from "../../components/normal/RightSidebar";
import BottomNav from "../../components/normal/BottomNav";
import { Heart, MessageCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useState, useEffect, useRef, useCallback } from "react";
import { getPosts, getReel } from "../../services/post";

const baseURL = import.meta.env.VITE_BASE_URL;

const Explore = () => {
  const { isDarkMode } = useApp();
  const [explorePosts, setExplorePosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const observer = useRef();
  const isInitialMount = useRef(true); // 초기 마운트 추적

  // 최신 값을 참조하기 위한 ref
  const loadingRef = useRef(loading);
  const hasMoreRef = useRef(hasMore);
  const pageRef = useRef(page);
  const nextCursorRef = useRef(nextCursor);

  // ref 업데이트
  useEffect(() => {
    loadingRef.current = loading;
    hasMoreRef.current = hasMore;
    pageRef.current = page;
    nextCursorRef.current = nextCursor;
  }, [loading, hasMore, page, nextCursor]);

  // 배열을 랜덤으로 섞는 함수
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // 데이터 로드 함수
  const loadMoreData = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;

    setLoading(true);
    try {
      // Feed 데이터 가져오기
      const feedData = await getPosts(undefined, pageRef.current, 14, true);
      const transformedFeeds = feedData.items.map((item) => ({
        id: item.id,
        type: "feed",
        image: `${baseURL}${item.imageUrl}`,
        likes: item.likeCount,
        comments: item.commentCount,
      }));

      // Reel 데이터 가져오기 (한 개)
      let transformedReel = null;
      try {
        const reelData = await getReel(nextCursorRef.current);
        if (reelData.reel) {
          transformedReel = {
            id: reelData.reel.id,
            type: "reel",
            image: `${baseURL}${reelData.reel.image_url}`,
            likes: reelData.reel.like_count,
            comments: reelData.reel.comment_count,
          };
          setNextCursor(reelData.nextCursor);
        }
      } catch (error) {
        console.log("Reel 데이터 없음:", error);
      }

      // Feed와 Reel을 합치고 랜덤으로 섞기
      const newPosts = transformedReel
        ? [...transformedFeeds, transformedReel]
        : transformedFeeds;
      const shuffledNewPosts = shuffleArray(newPosts);

      setExplorePosts((prev) => [...prev, ...shuffledNewPosts]);
      setPage((prev) => prev + 1);

      // 더 이상 데이터가 없으면 hasMore를 false로 설정
      if (feedData.items.length === 0) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("데이터를 가져오는 중 오류 발생:", error);
    } finally {
      setLoading(false);
    }
  }, []); // 의존성 배열 제거 - ref를 통해 최신 값 참조

  // 마지막 요소를 관찰하는 ref callback
  const lastPostElementRef = useCallback(
    (node) => {
      if (loadingRef.current) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current) {
          loadMoreData();
        }
      });
      if (node) observer.current.observe(node);
    },
    [loadMoreData]
  );

  // 초기 데이터 로드
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadMoreData();
    }
  }, []); // 빈 배열로 초기 한 번만 실행

  return (
    <>
      <LeftSidebar />
      <RightSidebar />
      <BottomNav />

      <Container $darkMode={isDarkMode}>
        <MainContent>
          <Grid>
            {explorePosts.map((post, index) => {
              // 마지막 요소에 ref 연결
              if (explorePosts.length === index + 1) {
                return (
                  <GridItem
                    key={`${post.type}-${post.id}`}
                    ref={lastPostElementRef}
                  >
                    <ImageWrapper>
                      <Image src={post.image} alt="" />
                      <Overlay>
                        <Stats>
                          <Stat>
                            <Heart size={20} fill="white" color="white" />
                            <span>{post.likes.toLocaleString()}</span>
                          </Stat>
                          <Stat>
                            <MessageCircle
                              size={20}
                              fill="white"
                              color="white"
                            />
                            <span>{post.comments}</span>
                          </Stat>
                        </Stats>
                      </Overlay>
                    </ImageWrapper>
                  </GridItem>
                );
              } else {
                return (
                  <GridItem key={`${post.type}-${post.id}`}>
                    <ImageWrapper>
                      <Image src={post.image} alt="" />
                      <Overlay>
                        <Stats>
                          <Stat>
                            <Heart size={20} fill="white" color="white" />
                            <span>{post.likes.toLocaleString()}</span>
                          </Stat>
                          <Stat>
                            <MessageCircle
                              size={20}
                              fill="white"
                              color="white"
                            />
                            <span>{post.comments}</span>
                          </Stat>
                        </Stats>
                      </Overlay>
                    </ImageWrapper>
                  </GridItem>
                );
              }
            })}
          </Grid>
          {loading && <LoadingText>로딩 중...</LoadingText>}
        </MainContent>
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

const MainContent = styled.main`
  width: 100%;
  padding: 30px 0;

  @media (min-width: 768px) {
    max-width: 975px;
    margin: 0 auto;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;

  @media (max-width: 767px) {
    gap: 2px;
  }
`;

const GridItem = styled.div`
  position: relative;
  aspect-ratio: 1;
  cursor: pointer;
`;

const ImageWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;

  &:hover > div {
    opacity: 1;
  }
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
`;

const Stats = styled.div`
  display: flex;
  gap: 30px;
  color: white;
`;

const Stat = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;

  svg {
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
  }
`;

const LoadingText = styled.div`
  text-align: center;
  padding: 20px;
  color: ${(props) => (props.theme.darkMode ? "#fff" : "#262626")};
  font-size: 14px;
`;

export default Explore;
