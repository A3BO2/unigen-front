import styled from "styled-components";
import LeftSidebar from "../../components/normal/LeftSidebar";
import RightSidebar from "../../components/normal/RightSidebar";
import BottomNav from "../../components/normal/BottomNav";
import { Heart, MessageCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useState, useEffect } from "react";
import { getPosts, getReel } from "../../services/post";

const baseURL = import.meta.env.VITE_BASE_URL;

const Explore = () => {
  const { isDarkMode } = useApp();
  const [explorePosts, setExplorePosts] = useState([]);

  // 배열을 랜덤으로 섞는 함수
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Feed 데이터 가져오기
        const feedData = await getPosts(undefined, 1, 14, true);
        const transformedFeeds = feedData.items.map((item) => ({
          id: item.id,
          type: "feed", // 타입 추가
          image: `${baseURL}${item.imageUrl}`,
          likes: item.likeCount,
          comments: item.commentCount,
        }));

        // Reel 데이터 가져오기
        const reelData = await getReel();
        const transformedReels = reelData.items.map((item) => ({
          id: item.id,
          type: "reel", // 타입 추가
          image: `${baseURL}${item.image_url}`,
          likes: item.like_count,
          comments: item.comment_count,
        }));

        // Feed와 Reel을 합치고 랜덤으로 섞기
        const allPosts = [...transformedFeeds, ...transformedReels];
        const shuffledPosts = shuffleArray(allPosts);

        setExplorePosts(shuffledPosts);
      } catch (error) {
        console.error("데이터를 가져오는 중 오류 발생:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <>
      <LeftSidebar />
      <RightSidebar />
      <BottomNav />

      <Container $darkMode={isDarkMode}>
        <MainContent>
          <Grid>
            {explorePosts.map((post) => (
              <GridItem key={post.id}>
                <ImageWrapper>
                  <Image src={post.image} alt="" />
                  <Overlay>
                    <Stats>
                      <Stat>
                        <Heart size={20} fill="white" color="white" />
                        <span>{post.likes.toLocaleString()}</span>
                      </Stat>
                      <Stat>
                        <MessageCircle size={20} fill="white" color="white" />
                        <span>{post.comments}</span>
                      </Stat>
                    </Stats>
                  </Overlay>
                </ImageWrapper>
              </GridItem>
            ))}
          </Grid>
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

export default Explore;
