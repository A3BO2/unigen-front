import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { X, Type, Crop, ChevronDown, Check } from "lucide-react";
import LeftSidebar from "../../components/normal/LeftSidebar";
import RightSidebar from "../../components/normal/RightSidebar";
import { useApp } from "../../context/AppContext";
import { createStory } from "../../services/story";
import Cropper from "react-easy-crop";

const StoryCreate = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useApp();
  const [step, setStep] = useState("select"); // select, edit
  const [preview, setPreview] = useState(null);
  const [originalfile, setOriginalFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isCropping, setIsCropping] = useState(false); // 자르기 모드인지 확인
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [prevCrop, setPrevCrop] = useState({ x: 0, y: 0 });
  const [prevZoom, setPrevZoom] = useState(1);
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setOriginalFile(selectedFile); // 원본 파일 저장

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
        setStep("edit");
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleTextClick = () => {
    const userInput = window.prompt("텍스트 입력", caption);
    if (userInput !== null) {
      setCaption(userInput);
    }
  };

  // 자르기 시작
  const startCropping = () => {
    setPrevCrop(crop);
    setPrevZoom(zoom);
    setIsCropping(true);
  };

  const cancelCropping = () => {
    setCrop(prevCrop);
    setZoom(prevZoom);
    setIsCropping(false);
  };

  const completeCropping = () => {
    setIsCropping(false);
  };

  const handlePost = async () => {
    // 파일 존재 유무 확인
    if (!preview) {
      alert("업로드할 사진이 없습니다.");
      return;
    }
    try {
      const finalImageBlob = await getFinalImage(
        preview,
        croppedAreaPixels,
        caption
      );

      // formData 생성
      const formData = new FormData();

      // 백엔드가 media라는 이름을 기다림
      formData.append("media", finalImageBlob, "story_edited.jpg");

      // API 호출
      await createStory(formData);

      alert("스토리가 업로드되었습니다!");
      navigate("/normal/home");
    } catch (error) {
      console.error(error);
      alert(error.message || "업로드 중 에러 발생.");
    }
  };

  return (
    <>
      <LeftSidebar />
      <RightSidebar />

      <Overlay onClick={() => navigate("/normal/home")}>
        <Modal onClick={(e) => e.stopPropagation()} $darkMode={isDarkMode}>
          <Header $darkMode={isDarkMode}>
            <CloseButton onClick={() => navigate("/normal/home")}>
              <X size={24} color={isDarkMode ? "#fff" : "#262626"} />
            </CloseButton>
            <Title $darkMode={isDarkMode}>스토리에 추가</Title>
          </Header>

          {step === "select" && (
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
                        src={`https://images.unsplash.com/photo-${
                          1500000000000 + i * 10000000
                        }?w=400&h=400&fit=crop`}
                        alt=""
                      />
                    </RecentImage>
                  ))}
                </RecentGrid>
              </RecentSection>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/* video/*"
                onChange={handleImageSelect}
                style={{ display: "none" }}
              />
            </SelectSection>
          )}

          {step === "edit" && preview && (
            <EditSection>
              <PreviewArea>
                <StoryFrame>
                  {isCropping ? (
                    <Cropper
                      image={preview} // selectedImage -> preview
                      crop={crop}
                      zoom={zoom}
                      aspect={9 / 16}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    />
                  ) : (
                    <>
                      {/* selectedImage -> preview */}
                      <PreviewImage src={preview} alt="Preview" />
                      {/* text -> caption */}
                      {caption && <TextOverlay>{caption}</TextOverlay>}
                    </>
                  )}
                </StoryFrame>
              </PreviewArea>

              <EditTools>
                {!isCropping ? (
                  // [평소] 텍스트 입력 & 자르기 시작 버튼
                  <>
                    <ToolButton onClick={handleTextClick}>
                      <Type size={24} />
                      <ToolLabel>텍스트</ToolLabel>
                    </ToolButton>

                    <ToolButton onClick={startCropping}>
                      <Crop size={24} />
                      <ToolLabel>사진 자르기</ToolLabel>
                    </ToolButton>
                  </>
                ) : (
                  // [자르기 중] 취소(X) & 완료(Check) 버튼
                  <>
                    <ToolButton onClick={cancelCropping}>
                      <X size={24} color="#ff3b30" />
                      <ToolLabel style={{ color: "#ff3b30" }}>취소</ToolLabel>
                    </ToolButton>

                    <ToolButton onClick={completeCropping}>
                      <Check size={24} color="#0095f6" />
                      <ToolLabel style={{ color: "#0095f6" }}>완료</ToolLabel>
                    </ToolButton>
                  </>
                )}
              </EditTools>

              <BottomActions>
                <ActionButton onClick={handlePost}>
                  <ActionLabel>스토리 만들기</ActionLabel>
                </ActionButton>
              </BottomActions>
            </EditSection>
          )}
        </Modal>
      </Overlay>
    </>
  );
};

// 이미지 처리 로직
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

async function getFinalImage(imageSrc, pixelCrop, captionText) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const width = pixelCrop ? pixelCrop.width : image.width;
  const height = pixelCrop ? pixelCrop.height : image.height;

  canvas.width = width;
  canvas.height = height;

  if (pixelCrop) {
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      width,
      height
    );
  } else {
    ctx.drawImage(image, 0, 0);
  }

  // 텍스트 그리기
  if (captionText) {
    const fontSize = width * 0.1;
    ctx.font = `700 ${fontSize}px sans-serif`;
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(captionText, width / 2, height / 2);
  }

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      "image/jpeg",
      0.95
    );
  });
}

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
  background: ${(props) => (props.$darkMode ? "#262626" : "white")};
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
  background: ${(props) => (props.$darkMode ? "#262626" : "white")};
  border-bottom: 1px solid ${(props) => (props.$darkMode ? "#000" : "#dbdbdb")};
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
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
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
