import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styled, { ThemeProvider } from "styled-components";
import {
  Camera,
  Mic,
  X,
  Sparkles,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import SeniorBottomNav from "../../components/senior/BottomNav";
import { createPost } from "../../services/post";
import { refineContent } from "../../services/senior";
import CameraModal from "../../components/normal/CameraModal";

// AI 테마 목록 (시니어 SNS 실사용 기준)
const THEMES = [
  { id: "intro", label: "소개하기", emoji: "🙋‍♀️" },
  { id: "daily", label: "오늘의 일상", emoji: "🌿" },
  { id: "greeting", label: "안부 인사", emoji: "👋" },
  { id: "family", label: "가족 이야기", emoji: "👨‍👩‍👧" },
  { id: "thanks", label: "감사 인사", emoji: "🙏" },
  { id: "memory", label: "추억 이야기", emoji: "📷" },
  { id: "cheer", label: "응원 · 다짐", emoji: "💪" },
  { id: "light", label: "소소한 웃음", emoji: "😊" },
];

// Base64 => File 변환 헬퍼
const dataURLtoFile = (dataUrl, filename) => {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");

      // [최적화] AI 분석용이므로 가로 800px 정도면 충분합니다 (Upload.jsx는 원본 크기 유지)
      const MAX_WIDTH = 800;
      let width = img.width;
      let height = img.height;

      // 비율 유지하며 크기 줄이기
      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      // 필터 없이 깨끗한 이미지만 그리기
      ctx.drawImage(img, 0, 0, width, height);

      // JPEG 품질 0.7(70%)로 압축 (Upload.jsx는 0.9)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      resolve(dataUrl);
    };

    img.onerror = (err) => reject(err);
  });
};

const Write = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useApp();
  const [step, setStep] = useState("selectMode"); // selectMode, uploadPhoto, write
  const [mode, setMode] = useState(null); // text, voice
  const [content, setContent] = useState("");
  const [photo, setPhoto] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false); // AI 로딩 상태
  const [isUploading, setIsUploading] = useState(false); // 업로드 로딩 상태
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);

  // 모드 선택
  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
    setStep("uploadPhoto");
  };

  // 음성 인식 시작
  const startVoiceRecording = () => {
    // Web Speech API 사용
    if (
      !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    ) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    setIsRecording(true);
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      // 기존 내용 뒤에 이어 붙이기
      setContent((prev) => prev + (prev ? " " : "") + transcript);
      setIsRecording(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech error", event);
      setIsRecording(false);
      alert("음성 인식에 실패했습니다. 다시 시도해주세요.");
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  // 사진 선택
  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // 여기서 압축 함수 실행!
        const compressedDataUrl = await compressImage(file);

        setPhoto(compressedDataUrl); // 압축된 이미지를 상태에 저장
        setStep("write");

        if (mode === "voice") {
          setTimeout(() => startVoiceRecording(), 500);
        }
      } catch (err) {
        console.error("이미지 처리 실패:", err);
        alert("사진을 불러오는데 실패했습니다.");
      }
    }
  };

  // AI 테마 적용
  const applyTheme = async (theme) => {
    if (isAiLoading) return;

    if (!content.trim() && !photo) {
      alert("변환할 내용이나 사진이 없습니다.");
      return;
    }

    setSelectedTheme(theme);
    setIsAiLoading(true);

    try {
      // theme.id만 보냄
      const refinedText = await refineContent(content, theme.id, photo);
      setContent(refinedText); // 결과로 내용 교체
    } catch (error) {
      console.error("🚨 [Write-Error] 에러 발생:", error);
      alert("AI 변환에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // 게시
  const handlePost = async () => {
    if (!content && !photo) {
      alert("내용을 입력하거나 사진을 선택해주세요.");
      return;
    }

    if (isUploading) return;
    setIsUploading(true);

    try {
      const formData = new FormData();

      formData.append("content", content);
      formData.append("postType", "feed");
      formData.append("isSeniorMode", "true");

      // 이미지 파일 변환 및 추가
      if (photo) {
        const file = dataURLtoFile(photo, `senior_upload_${Date.now()}.jpg`);
        formData.append("images", file);
      }

      await createPost(formData);

      navigate("/senior/home");
    } catch (error) {
      console.error(error);
      alert(error.message || "글 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }

    // 실제로는 백엔드에 전송
    alert("글이 업로드되었습니다!");
    navigate("/senior/home");
  };

  // 모바일 감지 함수
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  // 카메라 버튼 클릭 핸들러
  const handleCameraClick = () => {
    if (isMobileDevice()) {
      cameraInputRef.currnent?.click();
    } else {
      setShowCamera(true);
    }
  };

  // 웹캠 모달에서 찍은 사진 처리 (압축 로직 재사용)
  const handleWebcamCapture = async (file) => {
    try {
      const compressedDataUrl = await compressImage(file); // 기존 함수 재사용
      setPhoto(compressedDataUrl);
      setStep("write");
      if (mode === "voice") {
        setTimeout(() => startVoiceRecording(), 500);
      }
    } catch (err) {
      console.error(err);
      alert("사진 처리 실패");
    }
  };

  return (
    <ThemeProvider theme={{ $darkMode: isDarkMode }}>
      {/* 카메라 모달 추가 */}
      {showCamera && (
        <CameraModal
          onClose={() => setShowCamera(false)}
          onCapture={handleWebcamCapture}
        />
      )}
      <Container>
        <Header>
          <CancelButton onClick={() => navigate("/senior/home")}>
            <X size={32} strokeWidth={2.5} />
          </CancelButton>
          <Title>글쓰기</Title>
          {step === "write" && (
            <PostButton
              onClick={handlePost}
              disabled={(!content && !photo) || isUploading}
            >
              {isUploading ? "저장중..." : "올리기"}
            </PostButton>
          )}
        </Header>

        <Content>
          {step === "selectMode" && (
            <ModeSelector>
              <ModeButton onClick={() => handleModeSelect("text")}>
                <ModeEmoji>✍️</ModeEmoji>
                <ModeText>
                  <div>직접</div>
                  <div>쓰기</div>
                </ModeText>
              </ModeButton>
              <ModeButton onClick={() => handleModeSelect("voice")}>
                <ModeEmoji>🎤</ModeEmoji>
                <ModeText>
                  <div>말로</div>
                  <div>쓰기</div>
                </ModeText>
              </ModeButton>
            </ModeSelector>
          )}

          {step === "uploadPhoto" && (
            <UploadSection>
              <UploadTitle>사진을 선택해주세요</UploadTitle>
              <ButtonGroup>
                <PhotoButton onClick={handleCameraClick}>
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
                style={{ display: "none" }}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                style={{ display: "none" }}
              />
            </UploadSection>
          )}

          {step === "write" && (
            <>
              <PhotoPreview>
                <Photo src={photo} alt="선택한 사진" />
                <RemovePhotoButton
                  onClick={() => {
                    setPhoto(null);
                    setStep("uploadPhoto");
                  }}
                >
                  <X size={32} />
                </RemovePhotoButton>
              </PhotoPreview>

              <InputArea>
                <MicButton
                  onClick={startVoiceRecording}
                  $isRecording={isRecording}
                >
                  {isRecording ? (
                    <Mic size={24} className="animate-pulse" />
                  ) : (
                    <Mic size={24} />
                  )}
                  {isRecording ? "듣고 있어요..." : "말하기"}
                </MicButton>

                <TextArea
                  placeholder={
                    mode === "voice"
                      ? "사진을 보며 하고 싶은 말을 해보세요.\n제가 멋지게 다듬어 드릴게요!"
                      : "사진에 대해 설명해주세요..."
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </InputArea>

              <ThemeSection>
                <ThemeHeader>
                  <Sparkles size={28} color="#FFD700" fill="#FFD700" />
                  <ThemeTitle>AI 비서가 글 다듬어주기</ThemeTitle>
                </ThemeHeader>

                {isAiLoading ? (
                  <LoadingWrapper>
                    <Loader2 size={32} className="spin" />
                    <span>글을 예쁘게 포장하고 있어요...</span>
                  </LoadingWrapper>
                ) : (
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
                )}
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
  background: ${(props) => (props.theme.$darkMode ? "#000" : "#fff")};
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  padding-bottom: 100px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
`;
const Header = styled.header`
  position: sticky;
  top: 0;
  background: ${(props) => (props.theme.$darkMode ? "#000" : "#fff")};
  border-bottom: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;

  @media (max-width: 767px) {
    padding: 12px 16px;
  }
`;
const CancelButton = styled.button`
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  padding: 4px;
`;
const Title = styled.h1`
  font-size: calc(32px * var(--font-scale, 1));
  font-weight: 700;
`;
const PostButton = styled.button`
  font-size: calc(20px * var(--font-scale, 1));
  font-weight: 700;
  color: ${(props) =>
    props.disabled ? (props.theme.$darkMode ? "#3a3a3a" : "#999") : "#0095f6"};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  padding: 8px 16px;
`;
const Content = styled.div`
  padding: 24px;
`;
const ModeSelector = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 48px 24px;
  min-height: 500px;

  @media (max-width: 767px) {
    flex-direction: column;
  }
`;
const ModeButton = styled.button`
  flex: 1;
  max-width: 280px;
  min-width: 200px;
  height: 280px;
  font-size: calc(28px * var(--font-scale, 1));
  font-weight: 700;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#f5f5f5")};
  border: 3px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  border-radius: 20px;
  transition: all 0.2s;

  @media (max-width: 767px) {
    width: 280px;
    max-width: 100%;
    min-width: unset;
  }

  &:active {
    transform: scale(0.95);
    border-color: #0095f6;
  }
`;

const ModeEmoji = styled.div`
  font-size: calc(64px * var(--font-scale, 1));
  line-height: 1;
`;

const ModeText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: calc(28px * var(--font-scale, 1));
  font-weight: 700;
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
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
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
  background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#f5f5f5")};
  border: 3px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  border-radius: 20px;
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
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
`;
const InputArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
`;
const MicButton = styled.button`
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  background: ${(props) =>
    props.$isRecording ? "#ff4458" : props.theme.$darkMode ? "#333" : "#eee"};
  color: ${(props) =>
    props.$isRecording ? "#fff" : props.theme.$darkMode ? "#fff" : "#000"};
  .animate-pulse {
    animation: pulse 1s infinite;
  }
  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
    100% {
      opacity: 1;
    }
  }
`;
const TextArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  font-size: calc(22px * var(--font-scale, 1));
  line-height: 1.6;
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#f5f5f5")};
  padding: 16px;
  border: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  border-radius: 12px;
  resize: vertical;
  &:focus {
    border-color: #0095f6;
    outline: none;
  }
`;
const ThemeSection = styled.div`
  padding: 24px;
  background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#fff8e1")};
  border-radius: 16px;
  border: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#ffe082")};
`;
const ThemeHeader = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  margin-bottom: 16px;
`;
const ThemeTitle = styled.h2`
  font-size: calc(20px * var(--font-scale, 1));
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
  padding: 16px;
  background: ${(props) =>
    props.$selected ? "#0095f6" : props.theme.$darkMode ? "#0a0a0a" : "#fff"};
  border: 2px solid
    ${(props) =>
      props.$selected
        ? "#0095f6"
        : props.theme.$darkMode
        ? "#3a3a3a"
        : "#dbdbdb"};
  border-radius: 12px;
  color: ${(props) =>
    props.$selected ? "#fff" : props.theme.$darkMode ? "#fff" : "#000"};
  transition: all 0.2s;
  &:active {
    transform: scale(0.98);
  }
`;
const ThemeEmoji = styled.span`
  font-size: calc(32px * var(--font-scale, 1));
`;
const ThemeLabel = styled.span`
  font-size: calc(16px * var(--font-scale, 1));
  font-weight: 600;
  text-align: center;
`;
const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 16px;
  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  span {
    font-size: 16px;
    font-weight: 600;
    color: #666;
  }
`;

export default Write;
