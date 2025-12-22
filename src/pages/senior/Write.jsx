import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { ThemeProvider } from 'styled-components';
import { Camera, Mic, X, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import SeniorBottomNav from '../../components/senior/BottomNav';

// AI 테마 목록
const THEMES = [
  { id: 'kind', label: '온화한 말투', emoji: '😊' },
  { id: 'cute', label: '귀여운 말투', emoji: '🥰' },
  { id: 'letter', label: '손주에게 편지', emoji: '💌' },
  { id: 'friend', label: '친구에게 안부', emoji: '👋' }
];

const Write = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useApp();
  const [step, setStep] = useState('selectMode'); // selectMode, uploadPhoto, write
  const [mode, setMode] = useState(null); // text, voice
  const [content, setContent] = useState('');
  const [photo, setPhoto] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // 모드 선택
  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
    setStep('uploadPhoto');
  };

  // 음성 인식 시작
  const startVoiceRecording = () => {
    setIsRecording(true);

    // Web Speech API 사용
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'ko-KR';
      recognition.continuous = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setContent(transcript);
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
        alert('음성 인식에 실패했습니다. 다시 시도해주세요.');
      };

      recognition.start();
    } else {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다.');
      setIsRecording(false);
    }
  };

  // 사진 선택
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhoto(e.target.result);
        setStep('write');
        // 음성 모드인 경우 자동으로 음성 인식 시작
        if (mode === 'voice') {
          startVoiceRecording();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // AI 테마 적용
  const applyTheme = (theme) => {
    setSelectedTheme(theme);

    // 실제로는 백엔드 AI API를 호출하여 변환
    // 여기서는 Mock 변환
    let transformedContent = content;

    switch(theme.id) {
      case 'kind':
        transformedContent = content + '입니다. 좋은 하루 보내세요.';
        break;
      case 'cute':
        transformedContent = content + '이에요~ ^^';
        break;
      case 'letter':
        transformedContent = `사랑하는 손주에게,\n\n${content}\n\n항상 건강하렴.`;
        break;
      case 'friend':
        transformedContent = `안녕하세요~\n\n${content}\n\n다음에 또 만나요!`;
        break;
    }

    setContent(transformedContent);
  };

  // 게시
  const handlePost = () => {
    if (!content && !photo) {
      alert('내용을 입력하거나 사진을 선택해주세요.');
      return;
    }

    // 실제로는 백엔드에 전송
    console.log('Posting:', { content, photo, theme: selectedTheme });

    alert('글이 업로드되었습니다!');
    navigate('/senior/home');
  };

  return (
    <ThemeProvider theme={{ $darkMode: isDarkMode }}>
      <Container>
        <Header>
          <CancelButton onClick={() => navigate('/senior/home')}>
            <X size={32} strokeWidth={2.5} />
          </CancelButton>
          <Title>글쓰기</Title>
          {step === 'write' && (
            <PostButton onClick={handlePost} disabled={!content && !photo}>
              올리기
            </PostButton>
          )}
        </Header>

        <Content>
        {step === 'selectMode' && (
          <ModeSelector>
            <ModeButton onClick={() => handleModeSelect('text')}>
              ✍️ 직접 쓰기
            </ModeButton>
            <ModeButton onClick={() => handleModeSelect('voice')}>
              🎤 말로 쓰기
            </ModeButton>
          </ModeSelector>
        )}

        {step === 'uploadPhoto' && (
          <UploadSection>
            <UploadTitle>사진을 선택해주세요</UploadTitle>
            <ButtonGroup>
              <PhotoButton onClick={() => cameraInputRef.current?.click()}>
                <Camera size={56} strokeWidth={2.5} />
                <PhotoButtonLabel>사진 찍기</PhotoButtonLabel>
              </PhotoButton>
              <PhotoButton onClick={() => galleryInputRef.current?.click()}>
                <ImageIcon size={56} strokeWidth={2.5} />
                <PhotoButtonLabel>사진 올리기</PhotoButtonLabel>
              </PhotoButton>
            </ButtonGroup>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
          </UploadSection>
        )}

        {step === 'write' && (
          <>
            <PhotoPreview>
              <Photo src={photo} alt="선택한 사진" />
              <RemovePhotoButton onClick={() => {
                setPhoto(null);
                setStep('uploadPhoto');
              }}>
                <X size={32} />
              </RemovePhotoButton>
            </PhotoPreview>

            {isRecording && (
              <RecordingIndicator>
                <Mic size={48} />
                <RecordingText>듣고 있습니다...</RecordingText>
              </RecordingIndicator>
            )}

            {!isRecording && (
              <TextArea
                placeholder="사진에 대해 설명해주세요...

예: 오늘 손주랑 산책했어요"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                readOnly={mode === 'voice'}
              />
            )}

            <ThemeSection>
              <ThemeHeader>
                <Sparkles size={28} />
                <ThemeTitle>AI로 말투 바꾸기</ThemeTitle>
              </ThemeHeader>

              <ThemeList>
                {THEMES.map((theme) => (
                  <ThemeButton
                    key={theme.id}
                    onClick={() => applyTheme(theme)}
                    $selected={selectedTheme?.id === theme.id}
                  >
                    <ThemeEmoji>{theme.emoji}</ThemeEmoji>
                    <ThemeLabel>{theme.label}</ThemeLabel>
                  </ThemeButton>
                ))}
              </ThemeList>
            </ThemeSection>
          </>
        )}
        </Content>

        <SeniorBottomNav />
      </Container>
    </ThemeProvider>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.$darkMode ? '#000' : '#fff'};
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
  padding-bottom: 80px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  background: ${props => props.theme.$darkMode ? '#000' : '#fff'};
  border-bottom: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
`;

const CancelButton = styled.button`
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
  padding: 4px;
`;

const Title = styled.h1`
  font-size: calc(24px * var(--font-scale, 1));
  font-weight: 700;
`;

const PostButton = styled.button`
  font-size: calc(20px * var(--font-scale, 1));
  font-weight: 700;
  color: ${props => props.disabled ? (props.theme.$darkMode ? '#3a3a3a' : '#999') : '#0095f6'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  padding: 8px 16px;

  &:active {
    opacity: ${props => props.disabled ? 1 : 0.6};
  }
`;

const Content = styled.div`
  padding: 24px;
`;

const ModeSelector = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 48px 24px;
  min-height: 500px;
`;

const ModeButton = styled.button`
  width: 280px;
  height: 280px;
  font-size: calc(28px * var(--font-scale, 1));
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
  border: 3px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
  border-radius: 20px;
  transition: all 0.2s;

  &:active {
    transform: scale(0.95);
    border-color: #0095f6;
  }

  @media (max-width: 400px) {
    width: 240px;
    height: 240px;
    font-size: calc(24px * var(--font-scale, 1));
  }
`;

const UploadSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 48px 24px;
  min-height: 500px;
`;

const UploadTitle = styled.h2`
  font-size: calc(28px * var(--font-scale, 1));
  font-weight: 700;
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
  text-align: center;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 320px;
`;

const PhotoButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px 24px;
  background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
  border: 3px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
  border-radius: 20px;
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
  transition: all 0.2s;

  &:active {
    transform: scale(0.95);
    border-color: #0095f6;
  }
`;

const PhotoButtonLabel = styled.span`
  font-size: calc(24px * var(--font-scale, 1));
  font-weight: 700;
`;

const RecordingIndicator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 24px;
  background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
  border-radius: 16px;
  margin-bottom: 24px;
  border: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};

  svg {
    color: #f00;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const RecordingText = styled.p`
  font-size: calc(22px * var(--font-scale, 1));
  font-weight: 600;
  color: #f00;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 300px;
  font-size: calc(22px * var(--font-scale, 1));
  line-height: 1.6;
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
  background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
  padding: 16px;
  border: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
  border-radius: 12px;
  resize: vertical;

  &:focus {
    border-color: #0095f6;
  }

  &::placeholder {
    color: ${props => props.theme.$darkMode ? '#6a6a6a' : '#999'};
  }

  &:disabled {
    opacity: 0.5;
  }
`;

const PhotoPreview = styled.div`
  position: relative;
  margin-bottom: 24px;
`;

const Photo = styled.img`
  width: 100%;
  border-radius: 16px;
  margin-bottom: 16px;
`;

const RemovePhotoButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 8px;
  border-radius: 50%;

  &:active {
    opacity: 0.6;
  }
`;

const PhotoCaption = styled.textarea`
  width: 100%;
  min-height: 120px;
  font-size: calc(20px * var(--font-scale, 1));
  line-height: 1.6;
  color: #fff;
  background: #1a1a1a;
  padding: 16px;
  border: 2px solid #3a3a3a;
  border-radius: 12px;
  resize: vertical;

  &:focus {
    border-color: #fff;
  }

  &::placeholder {
    color: #6a6a6a;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 16px;
  margin: 24px 0;
`;

const ActionButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px 48px;
  background: #f5f5f5;
  border: 2px solid #e0e0e0;
  border-radius: 16px;
  color: #000;
  transition: all 0.2s;

  &:active {
    transform: scale(0.98);
    border-color: #0095f6;
  }
`;

const ActionLabel = styled.span`
  font-size: calc(22px * var(--font-scale, 1));
  font-weight: 600;
`;

const ThemeSection = styled.div`
  margin-top: 32px;
  padding: 24px;
  background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
  border-radius: 16px;
  border: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
`;

const ThemeHeader = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
  margin-bottom: 16px;
`;

const ThemeTitle = styled.h2`
  font-size: calc(22px * var(--font-scale, 1));
  font-weight: 700;
`;

const ThemeList = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const ThemeButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: ${props => props.$selected ? (props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0') : (props.theme.$darkMode ? '#0a0a0a' : '#fff')};
  border: 2px solid ${props => props.$selected ? '#0095f6' : (props.theme.$darkMode ? '#3a3a3a' : '#d0d0d0')};
  border-radius: 12px;
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
  transition: all 0.2s;

  &:active {
    transform: scale(0.98);
  }
`;

const ThemeEmoji = styled.span`
  font-size: calc(36px * var(--font-scale, 1));
`;

const ThemeLabel = styled.span`
  font-size: calc(16px * var(--font-scale, 1));
  font-weight: 600;
  text-align: center;
`;

export default Write;
