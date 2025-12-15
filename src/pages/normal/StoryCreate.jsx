import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { X, Type, Crop, ChevronDown } from 'lucide-react';
import LeftSidebar from '../../components/normal/LeftSidebar';
import RightSidebar from '../../components/normal/RightSidebar';
import { useApp } from '../../context/AppContext';

const StoryCreate = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useApp();
  const [step, setStep] = useState('select'); // select, edit
  const [selectedImage, setSelectedImage] = useState(null);
  const [text, setText] = useState('');
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target.result);
        setStep('edit');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = () => {
    alert('스토리가 업로드되었습니다!');
    navigate('/normal/home');
  };

  return (
    <>
      <LeftSidebar />
      <RightSidebar />

      <Overlay onClick={() => navigate('/normal/home')}>
        <Modal onClick={(e) => e.stopPropagation()} $darkMode={isDarkMode}>
          <Header $darkMode={isDarkMode}>
            <CloseButton onClick={() => navigate('/normal/home')}>
              <X size={24} color={isDarkMode ? '#fff' : '#262626'} />
            </CloseButton>
            <Title $darkMode={isDarkMode}>스토리에 추가</Title>
          </Header>

      {step === 'select' && (
        <SelectSection>
          <OptionCards>
            <OptionCard onClick={() => fileInputRef.current?.click()}>
              <OptionIcon>📸</OptionIcon>
              <OptionLabel>직접 추가</OptionLabel>
            </OptionCard>
          </OptionCards>

          <RecentSection>
            <RecentHeader>
              <RecentTitle>최근 항목</RecentTitle>
              <ChevronDown size={20} />
            </RecentHeader>
            <RecentGrid>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <RecentImage
                  key={i}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <img
                    src={`https://images.unsplash.com/photo-${1500000000000 + i * 10000000}?w=400&h=400&fit=crop`}
                    alt=""
                  />
                </RecentImage>
              ))}
            </RecentGrid>
          </RecentSection>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
        </SelectSection>
      )}

      {step === 'edit' && selectedImage && (
        <EditSection>
          <PreviewArea>
            <StoryFrame>
              <PreviewImage src={selectedImage} alt="Preview" />
              {text && <TextOverlay>{text}</TextOverlay>}
            </StoryFrame>
          </PreviewArea>

          <EditTools>
            <ToolButton>
              <Type size={24} />
              <ToolLabel>텍스트</ToolLabel>
            </ToolButton>
            <ToolButton>
              <Crop size={24} />
              <ToolLabel>사진 자르기</ToolLabel>
            </ToolButton>
          </EditTools>

          <BottomActions>
            <ActionButton onClick={handlePost}>
              <ActionLabel>내 스토리</ActionLabel>
            </ActionButton>
          </BottomActions>
        </EditSection>
      )}
        </Modal>
      </Overlay>
    </>
  );
};

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

const Modal = styled.div`
  background: ${props => props.$darkMode ? '#262626' : 'white'};
  border-radius: 12px;
  width: 90%;
  max-width: 540px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${props => props.$darkMode ? '#262626' : 'white'};
  border-bottom: 1px solid ${props => props.$darkMode ? '#000' : '#dbdbdb'};
`;

const CloseButton = styled.button`
  color: #262626;
  padding: 4px;
  cursor: pointer;

  &:hover {
    opacity: 0.7;
  }
`;

const Title = styled.h1`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.$darkMode ? '#fff' : '#262626'};
  flex: 1;
  text-align: center;
  margin-right: 28px;
`;

const SelectSection = styled.div`
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  max-height: calc(90vh - 55px);
`;

const OptionCards = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
  width: 100%;
`;

const OptionCard = styled.button`
  background: #fafafa;
  border: 1px solid #dbdbdb;
  border-radius: 16px;
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  max-width: 280px;

  &:hover {
    background: #f0f0f0;
    transform: scale(1.02);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const OptionIcon = styled.div`
  font-size: 72px;
`;

const OptionLabel = styled.span`
  font-size: 20px;
  font-weight: 600;
  color: #262626;
`;

const RecentSection = styled.div`
  margin-top: 24px;
  width: 100%;
`;

const RecentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 8px;
  margin-bottom: 12px;

  svg {
    color: #8e8e8e;
  }
`;

const RecentTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  color: #262626;
`;

const RecentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
`;

const RecentImage = styled.button`
  aspect-ratio: 1;
  overflow: hidden;
  cursor: pointer;
  background: #fafafa;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.2s;
  }

  &:hover img {
    transform: scale(1.05);
  }
`;

const EditSection = styled.div`
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  max-height: calc(90vh - 55px);
`;

const PreviewArea = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  overflow: hidden;
  padding: 20px;
  min-height: 400px;
`;

const StoryFrame = styled.div`
  width: 100%;
  max-width: 250px;
  aspect-ratio: 9 / 16;
  position: relative;
  background: #fff;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
`;

const TextOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  font-weight: 700;
  color: #262626;
  text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.8);
  text-align: center;
  padding: 12px 24px;
`;

const EditTools = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
  padding: 16px 8px;
  background: white;
  border-top: 1px solid #dbdbdb;
  min-height: 80px;
`;

const ToolButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #262626;
  cursor: pointer;
  padding: 6px;
  border-radius: 12px;
  transition: all 0.2s;

  &:hover {
    background: #fafafa;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const ToolLabel = styled.span`
  font-size: 11px;
  color: #262626;
`;

const BottomActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px 20px;
  background: white;
  border-top: 1px solid #dbdbdb;
`;

const ActionButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px;
  background: #0095f6;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #1877f2;
  }

  &:active {
    transform: scale(0.98);
  }
`;

const ActionLabel = styled.span`
  font-size: 14px;
  font-weight: 600;
`;

export default StoryCreate;
