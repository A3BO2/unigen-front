import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import styled from 'styled-components';

// Mock 추천 사용자 데이터
const SUGGESTIONS = [
  { id: 1, username: 'yang2ro', name: '양이로', avatar: '👤', followedBy: '친구 1명이 팔로우합니다' },
  { id: 2, username: 'ainbigi_', name: '아인비기', avatar: '👤', followedBy: '친구 2명이 팔로우합니다' },
  { id: 3, username: 'ch_umii', name: '추미', avatar: '👤', followedBy: '친구 1명이 팔로우합니다' },
  { id: 4, username: 'nahui0529', name: '나희', avatar: '👤', followedBy: '친구 3명이 팔로우합니다' },
  { id: 5, username: 'choi_doran', name: '최도란', avatar: '👤', followedBy: '친구 1명이 팔로우합니다' },
];

const RightSidebar = () => {
  const navigate = useNavigate();
  const { user, isDarkMode } = useApp();
  const [suggestions, setSuggestions] = useState(SUGGESTIONS);

  const handleFollow = (userId) => {
    setSuggestions(suggestions.filter(s => s.id !== userId));
  };

  return (
    <Container $darkMode={isDarkMode}>
      <UserProfile>
        <Avatar onClick={() => navigate('/normal/profile')}>
          <img src="https://i.pravatar.cc/150?img=1" alt="" />
        </Avatar>
        <UserInfo onClick={() => navigate('/normal/profile')}>
          <Username $darkMode={isDarkMode}>{user?.name || 'togeunalikyelwo'}</Username>
          <Name $darkMode={isDarkMode}>{user?.email || '회원님을 위한 추천'}</Name>
        </UserInfo>
        <SwitchButton>전환</SwitchButton>
      </UserProfile>

      <SuggestionsSection>
        <SuggestionsHeader>
          <SuggestionsTitle $darkMode={isDarkMode}>회원님을 위한 추천</SuggestionsTitle>
          <SeeAllButton>모두 보기</SeeAllButton>
        </SuggestionsHeader>

        <SuggestionsList>
          {suggestions.map((suggestion) => (
            <SuggestionItem key={suggestion.id}>
              <SuggestionAvatar>
                <img src={`https://i.pravatar.cc/150?img=${suggestion.id + 10}`} alt="" />
              </SuggestionAvatar>
              <SuggestionInfo>
                <SuggestionUsername $darkMode={isDarkMode}>{suggestion.username}</SuggestionUsername>
                <SuggestionMeta $darkMode={isDarkMode}>{suggestion.followedBy}</SuggestionMeta>
              </SuggestionInfo>
              <FollowButton onClick={() => handleFollow(suggestion.id)}>
                팔로우
              </FollowButton>
            </SuggestionItem>
          ))}
        </SuggestionsList>
      </SuggestionsSection>

      <Footer>
        <FooterLinks>
          <FooterLink href="#" $darkMode={isDarkMode}>정보</FooterLink>
          <FooterLink href="#" $darkMode={isDarkMode}>채용 정보</FooterLink>
          <FooterLink href="#" $darkMode={isDarkMode}>도움말</FooterLink>
          <FooterLink href="#" $darkMode={isDarkMode}>API</FooterLink>
          <FooterLink href="#" $darkMode={isDarkMode}>개인정보처리방침</FooterLink>
          <FooterLink href="#" $darkMode={isDarkMode}>약관</FooterLink>
          <FooterLink href="#" $darkMode={isDarkMode}>위치</FooterLink>
          <FooterLink href="#" $darkMode={isDarkMode}>언어</FooterLink>
          <FooterLink href="#" $darkMode={isDarkMode}>Meta Verified</FooterLink>
        </FooterLinks>
        <Copyright $darkMode={isDarkMode}>© 2025 UNIGEN FROM META</Copyright>
      </Footer>
    </Container>
  );
};

const Container = styled.aside`
  position: fixed;
  right: 0;
  top: 0;
  width: 335px;
  height: 100vh;
  padding: 36px 20px 20px 20px;
  overflow-y: auto;
  background: ${props => props.$darkMode ? '#000' : 'white'};
  border-left: 1px solid ${props => props.$darkMode ? '#262626' : '#dbdbdb'};

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 1264px) {
    display: none;
  }
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
`;

const Avatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const UserInfo = styled.div`
  flex: 1;
  cursor: pointer;
`;

const Username = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.$darkMode ? '#fff' : '#262626'};
`;

const Name = styled.div`
  font-size: 14px;
  color: ${props => props.$darkMode ? '#8e8e8e' : '#8e8e8e'};
`;

const SwitchButton = styled.button`
  font-size: 12px;
  font-weight: 600;
  color: #0095f6;
  cursor: pointer;

  &:hover {
    color: #00376b;
  }
`;

const SuggestionsSection = styled.div`
  margin-bottom: 24px;
`;

const SuggestionsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const SuggestionsTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.$darkMode ? '#8e8e8e' : '#8e8e8e'};
`;

const SeeAllButton = styled.button`
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.$darkMode ? '#fff' : '#262626'};
  cursor: pointer;

  &:hover {
    color: ${props => props.$darkMode ? '#8e8e8e' : '#8e8e8e'};
  }
`;

const SuggestionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SuggestionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SuggestionAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const SuggestionInfo = styled.div`
  flex: 1;
  cursor: pointer;
`;

const SuggestionUsername = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.$darkMode ? '#fff' : '#262626'};

  &:hover {
    opacity: 0.6;
  }
`;

const SuggestionMeta = styled.div`
  font-size: 12px;
  color: ${props => props.$darkMode ? '#8e8e8e' : '#8e8e8e'};
`;

const FollowButton = styled.button`
  font-size: 12px;
  font-weight: 600;
  color: #0095f6;
  cursor: pointer;

  &:hover {
    color: #00376b;
  }
`;

const Footer = styled.footer`
  margin-top: 32px;
`;

const FooterLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-bottom: 16px;
`;

const FooterLink = styled.a`
  font-size: 11px;
  color: ${props => props.$darkMode ? '#8e8e8e' : '#c7c7c7'};
  cursor: pointer;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }

  &::after {
    content: '·';
    margin-left: 8px;
    color: ${props => props.$darkMode ? '#8e8e8e' : '#c7c7c7'};
  }

  &:last-child::after {
    display: none;
  }
`;

const Copyright = styled.div`
  font-size: 11px;
  color: ${props => props.$darkMode ? '#8e8e8e' : '#c7c7c7'};
`;

export default RightSidebar;
