import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { X, Type, Crop, Check, Palette } from "lucide-react";
import LeftSidebar from "../../components/normal/LeftSidebar";
import RightSidebar from "../../components/normal/RightSidebar";
import { useApp } from "../../context/AppContext";
import { createStory } from "../../services/story";
import Cropper from "react-easy-crop";
import Draggable from "react-draggable";

const StoryCreate = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useApp();
  const [step, setStep] = useState("select"); // select, edit
  const [preview, setPreview] = useState(null);
  const [originalPreview, setOriginalPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isCropping, setIsCropping] = useState(false); // 자르기 모드인지 확인
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [prevCrop, setPrevCrop] = useState({ x: 0, y: 0 });
  const [prevZoom, setPrevZoom] = useState(1);

  const [textPos, setTextPos] = useState({ x: 0, y: 0 }); // 텍스트 위치
  const [fontSize, setFontSize] = useState(20); // 폰트 크기
  const [fontColor, setFontColor] = useState("#ffffff"); // 폰트 색상
  const [showStyleControls, setShowStyleControls] = useState(false);
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);
  const fileInputRef = useRef(null);
  const previewAreaRef = useRef(null);
  const nodeRef = useRef(null);

  const handleImageSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // FileReader 대신 URL.createObjectURL 사용 (더 빠르고 간단함)
      const objectUrl = URL.createObjectURL(selectedFile);

      setPreview(objectUrl); // 현재 화면에 보일 이미지 (나중에 잘린 걸로 바뀜)
      setOriginalPreview(objectUrl); // [추가] 원본 보존용 (절대 안 바뀜)

      setStep("edit");
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
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setIsCropping(true);
    setShowStyleControls(false);
  };

  const cancelCropping = () => {
    setCrop(prevCrop);
    setZoom(prevZoom);
    setIsCropping(false);
  };

  const completeCropping = async () => {
    try {
      // 현재 설정된 크롭 영역(croppedAreaPixels)을 기반으로 이미지를 자름
      // 텍스트는 아직 합치지 않고 null로 보냄
      const croppedBlob = await getFinalImage(
        originalPreview,
        croppedAreaPixels,
        null
      );

      // 잘린 이미지를 변환하여 미리보기 업데이트
      const newPreviewUrl = URL.createObjectURL(croppedBlob);
      setPreview(newPreviewUrl);

      setCroppedAreaPixels(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);

      setIsCropping(false);
    } catch (err) {
      console.error("Crop error:", err);
      alert("이미지 자르기 실패!");
    }
  };

  const handlePost = async () => {
    // 파일 존재 유무 확인
    if (!preview) {
      alert("업로드할 사진이 없습니다.");
      return;
    }
    try {
      // 좌표 보정 로직
      let finalTextData = null;

      if (caption && previewAreaRef.current) {
        // 현재 눈에 보이는 이미지 영역
        const displayedWidth = previewAreaRef.current.clientWidth;
        const displayedHeight = previewAreaRef.current.clientHeight;

        // 텍스트 정보 묶기 (비율로 저장하거나 픽셀값 그대로 전달해서 내부에서 계산)
        finalTextData = {
          text: caption,
          x: textPos.x, // 드래그된 x좌표
          y: textPos.y, // 드래그된 y좌표
          fontSize: fontSize,
          color: fontColor,
          displayedWidth, // 화면에 보였던 너비
          displayedHeight, // 화면에 보였던 높이
        };
      }

      const finalImageBlob = await getFinalImage(
        preview,
        croppedAreaPixels,
        finalTextData
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
                <StoryFrame ref={previewAreaRef}>
                  {isCropping ? (
                    <Cropper
                      image={originalPreview}
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
                      {caption && (
                        <Draggable
                          position={textPos}
                          onStop={(e, data) =>
                            setTextPos({ x: data.x, y: data.y })
                          }
                          nodeRef={nodeRef}
                          bounds="parent"
                        >
                          <DraggableText
                            ref={nodeRef}
                            style={{
                              fontSize: `${fontSize}px`,
                              color: fontColor,
                            }}
                          >
                            {caption}
                          </DraggableText>
                        </Draggable>
                      )}
                    </>
                  )}
                </StoryFrame>
              </PreviewArea>

              {/* 텍스트 스타일 조절 패널 */}
              {showStyleControls && !isCropping && (
                <StyleControlPanel $darkMode={isDarkMode}>
                  <ControlRow $darkMode={isDarkMode}>
                    <ControlLabel $darkMode={isDarkMode}>크기</ControlLabel>
                    <RangeInput
                      type="range"
                      min="1"
                      max="60"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      $darkMode={isDarkMode}
                    />
                  </ControlRow>
                  <ControlRow $darkMode={isDarkMode}>
                    <ControlLabel $darkMode={isDarkMode}>색상</ControlLabel>
                    <ColorPicker>
                      {[
                        "#ffffff",
                        "#000000",
                        "#ff0000",
                        "#ffff00",
                        "#00ff00",
                        "#0000ff",
                      ].map((color) => (
                        <ColorCircle
                          key={color}
                          color={color}
                          onClick={() => setFontColor(color)}
                          $selected={fontColor === color}
                        />
                      ))}
                    </ColorPicker>
                  </ControlRow>
                </StyleControlPanel>
              )}

              <EditTools>
                {!isCropping ? (
                  // [평소] 텍스트 입력 & 자르기 시작 버튼
                  <>
                    <ToolButton onClick={handleTextClick}>
                      <Type size={24} />
                      <ToolLabel>텍스트</ToolLabel>
                    </ToolButton>

                    {/* 👇 스타일 조절 버튼 추가 */}
                    <ToolButton
                      onClick={() => setShowStyleControls(!showStyleControls)}
                      $active={showStyleControls}
                    >
                      <Palette size={24} />
                      <ToolLabel>글자 꾸미기</ToolLabel>
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

async function getFinalImage(imageSrc, pixelCrop, textData) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  let width, height;
  let drawX, drawY, drawW, drawH;

  if (pixelCrop) {
    // [사용자가 자르기 도구를 쓴 경우] -> 자른 영역 그대로 사용
    width = pixelCrop.width;
    height = pixelCrop.height;
    drawX = 0;
    drawY = 0;
    drawW = width;
    drawH = height;
  } else {
    // [자르기 안 한 경우] -> 9:16 비율(스토리 규격) 캔버스 생성 및 레터박스(여백) 처리
    const targetAspect = 9 / 16;
    const imageAspect = image.width / image.height;

    if (imageAspect > targetAspect) {
      // 이미지가 더 납작함 (가로형, 정사각형 등) -> 가로를 꽉 채우고 위아래 여백
      width = image.width;
      height = image.width / targetAspect; // 9:16 비율에 맞게 높이 늘림

      drawW = image.width;
      drawH = image.height;
      drawX = 0;
      drawY = (height - image.height) / 2; // 세로 중앙 정렬
    } else {
      // 이미지가 더 길쭉함 (세로형 파노라마 등) -> 세로를 꽉 채우고 좌우 여백
      height = image.height;
      width = image.height * targetAspect; // 9:16 비율에 맞게 너비 늘림

      drawW = image.width;
      drawH = image.height;
      drawX = (width - image.width) / 2; // 가로 중앙 정렬
      drawY = 0;
    }
  }

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
    ctx.drawImage(image, drawX, drawY, drawW, drawH);
  }

  // 텍스트 그리기
  if (textData && textData.text) {
    const { text, x, y, fontSize, color, displayedWidth, displayedHeight } =
      textData;
    const scaleX = width / displayedWidth;
    const scaleY = height / displayedHeight;
    const scaleFont = width / displayedWidth;
    const finalX = x * scaleX;
    const finalY = y * scaleY;
    const finalFontSize = fontSize * scaleFont;
    const lineHeight = finalFontSize * 1.2;

    ctx.font = `700 ${finalFontSize}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = "top"; // 좌표를 글자의 좌측 상단 기준으로 잡음 (Draggable과 일치시키기 위해)

    // 그림자
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4 * scaleFont;
    ctx.shadowOffsetX = 2 * scaleFont;
    ctx.shadowOffsetY = 2 * scaleFont;

    const maxWidth = width * 0.9;
    const words = text.split("");
    let line = "";
    let currentY = finalY;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      // 현재 줄이 최대 너비를 넘어가면
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, finalX, currentY); // 현재 줄 그리고
        line = words[n]; // 다음 줄 첫 글자로 설정
        currentY += lineHeight; // Y좌표 내리기
      } else {
        line = testLine; // 아직 안 넘었으면 글자 추가
      }
    }

    ctx.fillText(text, finalX, currentY);
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
  object-fit: contain;
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

// 👇 [추가] 드래그 가능한 텍스트 스타일
const DraggableText = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  cursor: grab;
  user-select: none;
  white-space: nowrap;
  padding: 8px;
  white-space: pre-wrap; /* 줄바꿈 허용 */
  word-break: break-all; /* 긴 단어도 강제로 줄바꿈 */
  max-width: 90%; /* 화면 너비의 90%를 넘지 않도록 제한 */
  text-align: center; /* 가운데 정렬 (선택사항) */
  line-height: 1.2; /* 줄 간격 */
  /* 드래그할 때 테두리 보여주기 (선택사항) */
  &:active {
    border: 1px dashed white;
    cursor: grabbing;
  }
`;

// 👇 [추가] 스타일 조절 패널
const StyleControlPanel = styled.div`
  background: ${(props) => (props.$darkMode ? "#1a1a1a" : "#f0f0f0")};
  padding: 16px 20px;
  border-top: 1px solid ${(props) => (props.$darkMode ? "#2a2a2a" : "#dbdbdb")};
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ControlLabel = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  min-width: 40px;
  flex-shrink: 0;
`;

const RangeInput = styled.input`
  flex: 1;
  cursor: pointer;
  height: 6px;
  border-radius: 3px;
  background: ${(props) => (props.$darkMode ? "#2a2a2a" : "#dbdbdb")};
  outline: none;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${(props) => (props.$darkMode ? "#0095f6" : "#0095f6")};
    cursor: pointer;
    border: 2px solid ${(props) => (props.$darkMode ? "#1a1a1a" : "#fff")};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${(props) => (props.$darkMode ? "#0095f6" : "#0095f6")};
    cursor: pointer;
    border: 2px solid ${(props) => (props.$darkMode ? "#1a1a1a" : "#fff")};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

const ColorPicker = styled.div`
  display: flex;
  gap: 8px;
`;

const ColorCircle = styled.button`
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  border-radius: 50%;
  background: ${(props) => props.color};
  border: ${(props) =>
    props.$selected
      ? "3px solid #0095f6"
      : props.color === "#ffffff"
      ? "2px solid #dbdbdb"
      : "2px solid transparent"};
  cursor: pointer;
  padding: 0;
  margin: 0;
  outline: none;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: ${(props) => (props.$selected ? "scale(1.15)" : "scale(1)")};
  transition: all 0.2s ease;
  box-shadow: ${(props) =>
    props.$selected ? "0 2px 8px rgba(0, 149, 246, 0.4)" : "none"};
  flex-shrink: 0;
  -webkit-appearance: none;
  appearance: none;

  &:hover {
    transform: scale(1.1);
  }

  &:active {
    transform: ${(props) => (props.$selected ? "scale(1.1)" : "scale(0.95)")};
  }

  &:focus {
    outline: none;
  }
`;

export default StoryCreate;
