import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import LeftSidebar from '../../components/normal/LeftSidebar';
import RightSidebar from '../../components/normal/RightSidebar';
import BottomNav from '../../components/normal/BottomNav';

const ProfileEdit = () => {
  const { user, isDarkMode } = useApp();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    username: user?.name || '',
    bio: '',
    email: '',
    phone: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('프로필이 업데이트되었습니다!');
    navigate('/normal/profile');
  };

  return (
    <>
      <LeftSidebar />
      <RightSidebar />
      <BottomNav />

      <Container $darkMode={isDarkMode}>
        <MobileHeader $darkMode={isDarkMode}>
          <BackButton onClick={() => navigate('/normal/profile')}>
            <ArrowLeft size={24} color={isDarkMode ? '#fff' : '#262626'} />
          </BackButton>
          <HeaderTitle $darkMode={isDarkMode}>프로필 편집</HeaderTitle>
          <SubmitButton onClick={handleSubmit}>완료</SubmitButton>
        </MobileHeader>

        <MainContent $darkMode={isDarkMode}>
          <Header $darkMode={isDarkMode}>
            <Title $darkMode={isDarkMode}>프로필 편집</Title>
          </Header>

          <Form onSubmit={handleSubmit}>
            <ProfileSection $darkMode={isDarkMode}>
              <ProfileImageWrapper>
                <ProfileImage>👤</ProfileImage>
              </ProfileImageWrapper>
              <ChangePhotoButton $darkMode={isDarkMode}>프로필 사진 바꾸기</ChangePhotoButton>
            </ProfileSection>

            <FormGroup>
              <Label $darkMode={isDarkMode}>이름</Label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="이름"
                $darkMode={isDarkMode}
              />
            </FormGroup>

            <FormGroup>
              <Label $darkMode={isDarkMode}>사용자 이름</Label>
              <Input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="사용자 이름"
                $darkMode={isDarkMode}
              />
            </FormGroup>

            <FormGroup>
              <Label $darkMode={isDarkMode}>소개</Label>
              <Textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="소개"
                rows={3}
                $darkMode={isDarkMode}
              />
            </FormGroup>

            <Divider $darkMode={isDarkMode} />

            <FormGroup>
              <Label $darkMode={isDarkMode}>이메일</Label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="이메일"
                $darkMode={isDarkMode}
              />
            </FormGroup>

            <FormGroup>
              <Label $darkMode={isDarkMode}>전화번호</Label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="전화번호"
                $darkMode={isDarkMode}
              />
            </FormGroup>

            <DesktopSubmitButton type="submit">제출</DesktopSubmitButton>
          </Form>
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

const MobileHeader = styled.header`
  display: none;
  position: sticky;
  top: 0;
  background: ${props => props.$darkMode ? '#000' : 'white'};
  border-bottom: 1px solid ${props => props.$darkMode ? '#262626' : '#dbdbdb'};
  padding: 12px 16px;
  align-items: center;
  justify-content: space-between;
  z-index: 10;

  @media (max-width: 767px) {
    display: flex;
  }
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  outline: none;
  border: none;
  background: transparent;
  padding: 0;
`;

const HeaderTitle = styled.h1`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.$darkMode ? '#fff' : '#262626'};
  flex: 1;
  text-align: center;
  margin: 0 16px;
`;

const SubmitButton = styled.button`
  font-size: 14px;
  font-weight: 600;
  color: #0095f6;
  cursor: pointer;
  outline: none;
  border: none;
  background: transparent;

  &:hover {
    color: #00376b;
  }
`;

const MainContent = styled.main`
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  background: ${props => props.$darkMode ? '#000' : 'white'};
  min-height: 100vh;

  @media (max-width: 767px) {
    background: ${props => props.$darkMode ? '#000' : '#fafafa'};
  }
`;

const Header = styled.div`
  padding: 30px 20px 20px;
  border-bottom: 1px solid ${props => props.$darkMode ? '#262626' : '#dbdbdb'};

  @media (max-width: 767px) {
    display: none;
  }
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: ${props => props.$darkMode ? '#fff' : '#262626'};
`;

const Form = styled.form`
  padding: 20px;

  @media (max-width: 767px) {
    padding: 16px;
  }
`;

const ProfileSection = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 0;
  border-bottom: 1px solid ${props => props.$darkMode ? '#262626' : '#dbdbdb'};
  margin-bottom: 20px;

  @media (max-width: 767px) {
    flex-direction: column;
    text-align: center;
  }
`;

const ProfileImageWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ProfileImage = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #fafafa;
  border: 1px solid #dbdbdb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
`;

const ChangePhotoButton = styled.button`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.$darkMode ? '#0095f6' : '#0095f6'};
  cursor: pointer;
  outline: none;
  border: none;
  background: transparent;

  &:hover {
    color: ${props => props.$darkMode ? '#1877f2' : '#00376b'};
  }
`;

const FormGroup = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.$darkMode ? '#fff' : '#262626'};
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid ${props => props.$darkMode ? '#262626' : '#dbdbdb'};
  border-radius: 6px;
  font-size: 14px;
  color: ${props => props.$darkMode ? '#fff' : '#262626'};
  background: ${props => props.$darkMode ? '#000' : 'white'};
  outline: none;

  &::placeholder {
    color: #8e8e8e;
  }

  &:focus {
    border-color: ${props => props.$darkMode ? '#3a3a3a' : '#a8a8a8'};
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 1px solid ${props => props.$darkMode ? '#262626' : '#dbdbdb'};
  border-radius: 6px;
  font-size: 14px;
  color: ${props => props.$darkMode ? '#fff' : '#262626'};
  background: ${props => props.$darkMode ? '#000' : 'white'};
  font-family: inherit;
  resize: vertical;
  outline: none;

  &::placeholder {
    color: #8e8e8e;
  }

  &:focus {
    border-color: ${props => props.$darkMode ? '#3a3a3a' : '#a8a8a8'};
  }
`;

const Divider = styled.div`
  height: 1px;
  background: ${props => props.$darkMode ? '#262626' : '#dbdbdb'};
  margin: 32px 0;
`;

const DesktopSubmitButton = styled.button`
  background: #0095f6;
  color: white;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  outline: none;
  border: none;

  &:hover {
    background: #1877f2;
  }

  @media (max-width: 767px) {
    display: none;
  }
`;

export default ProfileEdit;
