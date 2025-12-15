import styled from 'styled-components';
import LeftSidebar from '../../components/normal/LeftSidebar';
import RightSidebar from '../../components/normal/RightSidebar';
import BottomNav from '../../components/normal/BottomNav';
import { Heart, MessageCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

// Mock 탐색 데이터
const EXPLORE_POSTS = [
  { id: 1, image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500', likes: 1234, comments: 45 },
  { id: 2, image: 'https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=500', likes: 892, comments: 23 },
  { id: 3, image: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=500', likes: 2156, comments: 67 },
  { id: 4, image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=500', likes: 3421, comments: 89 },
  { id: 5, image: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=500', likes: 1876, comments: 34 },
  { id: 6, image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500', likes: 945, comments: 12 },
  { id: 7, image: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=500', likes: 2341, comments: 56 },
  { id: 8, image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=500', likes: 1567, comments: 43 },
  { id: 9, image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=500', likes: 3892, comments: 91 },
  { id: 10, image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500', likes: 2678, comments: 78 },
  { id: 11, image: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=500', likes: 1234, comments: 29 },
  { id: 12, image: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=500', likes: 4123, comments: 102 },
];

const Explore = () => {
  const { isDarkMode } = useApp();

  return (
    <>
      <LeftSidebar />
      <RightSidebar />
      <BottomNav />

      <Container $darkMode={isDarkMode}>
        <MainContent>
          <Grid>
            {EXPLORE_POSTS.map((post) => (
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
  background: ${props => props.$darkMode ? '#000' : '#fafafa'};

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
