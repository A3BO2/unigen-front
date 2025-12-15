import styled from 'styled-components';
import { Search as SearchIcon } from 'lucide-react';
import BottomNav from '../../components/normal/BottomNav';

const Search = () => {
  return (
    <Container>
      <Header>
        <SearchBar>
          <SearchIcon size={16} color="#262626" />
          <Input placeholder="검색" />
        </SearchBar>
      </Header>

      <Grid>
        {[...Array(12)].map((_, i) => (
          <GridItem key={i}>
            <Placeholder style={{ background: `hsl(${i * 30}, 70%, 60%)` }} />
          </GridItem>
        ))}
      </Grid>

      <BottomNav />
    </Container>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: #fafafa;
  padding-bottom: 60px;
  max-width: 614px;
  margin: 0 auto;
  width: 100%;
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  background: white;
  padding: 8px 16px;
  z-index: 10;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #efefef;
  border-radius: 8px;
`;

const Input = styled.input`
  flex: 1;
  font-size: 14px;
  background: transparent;
  color: #262626;

  &::placeholder {
    color: #8e8e8e;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
`;

const GridItem = styled.div`
  aspect-ratio: 1;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
`;

const Placeholder = styled.div`
  width: 100%;
  height: 100%;
`;

export default Search;
