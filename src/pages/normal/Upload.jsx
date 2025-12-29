import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Maximize2, Loader2, ArrowLeft } from "lucide-react";
import LeftSidebar from "../../components/normal/LeftSidebar";
import RightSidebar from "../../components/normal/RightSidebar";
import { useApp } from "../../context/AppContext";
import Cropper from "react-easy-crop";
import { createPost } from "../../services/post";
import CameraModal from "../../components/normal/CameraModal";

// 필터 값 정의
const FILTER_STYLES = {
  normal: "",
  aden: "hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)",
  clarendon: "contrast(1.2) saturate(1.35)",
  crema: "sepia(0.5) contrast(0.8)",
  gingham: "brightness(1.05) hue-rotate(-10deg)",
  juno: "sepia(0.35) saturate(1.6)",
  lark: "contrast(0.9) brightness(1.2) saturate(1.1)",
  ludwig: "sepia(0.25) contrast(0.9) saturate(1.1)",
  moon: "grayscale(1) contrast(1.1) brightness(1.1)",
  perpetua: "contrast(1.1) brightness(1.2) saturate(1.1)",
  reyes: "sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)",
  slumber: "sepia(0.35) contrast(0.9) saturate(1.2)",
};

const FILTERS = [
  { name: "일반", value: "normal" },
  { name: "Aden", value: "aden" },
  { name: "Clarendon", value: "clarendon" },
  { name: "Crema", value: "crema" },
  { name: "Gingham", value: "gingham" },
  { name: "Juno", value: "juno" },
  { name: "Lark", value: "lark" },
  { name: "Ludwig", value: "ludwig" },
  { name: "Moon", value: "moon" },
  { name: "Perpetua", value: "perpetua" },
  { name: "Reyes", value: "reyes" },
  { name: "Slumber", value: "slumber" },
];

const Upload = () => {
  const navigate = useNavigate();
  const { isDarkMode, user } = useApp();
  const [contentType, setContentType] = useState("photo"); // 'photo', 'reels'
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [step, setStep] = useState("select"); // 'select', 'crop', 'filter', 'final'
  const [editTab, setEditTab] = useState("filter"); // 'filter', 'adjust'
  const [selectedFilter, setSelectedFilter] = useState("normal");

  const [originalFile, setOriginalFile] = useState(null);
  const [finalFile, setFinalFile] = useState(null); // 최종 필터 먹인 파일 보관용
  const [aspectRatio, setAspectRatio] = useState(null);
  const [originalAspect, setOriginalAspect] = useState(1);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // 업로드 시 상태 관리 state(업로드 로딩 창)
  const [isUploading, setIsUploading] = useState(false);

  // 카메라 모달 표시 여부 state 추가
  const [showCamera, setShowCamera] = useState(false);
  const mobileCameraInputRef = useRef(null); // 모바일 카메라용

  const [adjustments, setAdjustments] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0,
  });
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setOriginalFile(file);

      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      // 릴스면 자르기 생략
      if (contentType === "reels") {
        setFinalFile(file);
        setStep("final");
      } else {
        setStep("crop");
      }
    }
  };

  // 사용자가 드래그를 멈췄을 때 좌표를 저장하는 함수
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleNext = async () => {
    if (step === "crop") {
      if (contentType === "reels") {
        // 릴스는 자르기/필터 없이 바로 원본 파일 설정
        setFinalFile(originalFile);
        setStep("final");
      } else {
        // 자르기 단계 => 필터 단계로 넘어갈 때 실제로 이미지를 자름
        try {
          // 1. 원본 이미지 불러옴
          const image = new Image();
          image.src = preview; // 현재 보고 있는 원본 이미지

          // 2. 이미지가 로드되면 캔버스로 자르기 수행
          await new Promise((resolve) => {
            image.onload = () => {
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");

              // 잘라낼 크기 설정
              canvas.width = croppedAreaPixels.width;
              canvas.height = croppedAreaPixels.height;

              // 원본에서 해당 영역만큼 가져오기
              ctx.drawImage(
                image,
                croppedAreaPixels.x,
                croppedAreaPixels.y,
                croppedAreaPixels.width,
                croppedAreaPixels.height,
                0,
                0,
                croppedAreaPixels.width,
                croppedAreaPixels.height
              );

              // 3. 잘린 이미지를 Blob으로 변환하여 preview
              canvas.toBlob((blob) => {
                const newFile = new File([blob], "cropped.jpg", {
                  type: "image/jpeg",
                });
                setOriginalFile(newFile); // 필터 단계에서 쓸 파일로 교체
                setPreview(URL.createObjectURL(newFile)); // 미리보기 교체
                resolve();
              }, "image/jpeg");
            };
          });

          setStep("filter");
        } catch (e) {
          console.error(e);
          alert("이미지 자르기 실패");
        }
      }
    } else if (step === "filter") {
      // 필터 적용 로직 시작
      // 최종 단계로 넘어갈 때 이미지 굽기 수행
      try {
        if (!originalFile) {
          alert("편집할 파일이 없습니다.");
          return;
        }

        // 필터 입힌 새 파일 생성
        const processedFile = await processImage(originalFile, selectedFilter);

        setFinalFile(processedFile);

        // 미리보기 URL로 변환 > preview 업데이트
        const newPreview = URL.createObjectURL(processedFile);
        setPreview(newPreview);

        // 다음 단계 넘어가기
        setStep("final");
      } catch (error) {
        console.error("이미지 처리 실패:", error);
        alert("이미지 필터 적용 중 오류 발생");
      }
    }
  };

  // 이미지 로드 후 원본 비율 저장
  const onMediaLoaded = (mediaSize) => {
    const { naturalWidth, naturalHeight } = mediaSize;
    const ratio = naturalWidth / naturalHeight;
    setOriginalAspect(ratio);

    // 처음에 비율 설정이 안되어있다면 원본 비율로 시작
    if (!aspectRatio) {
      setAspectRatio(ratio);
    }
  };

  const getAppliedFilterStyle = () => {
    // 1. 필터 가져오기
    const baseFilter = FILTER_STYLES[selectedFilter] || "";

    // 2. 조정값 더하기(슬라이더 기본값은 0, CSS 기본값은 100% => 100을 더해줌)
    const adjustFilter = `
      brightness(${100 + parseInt(adjustments.brightness)}%)
      contrast(${100 + parseInt(adjustments.contrast)}%)
      saturate(${100 + parseInt(adjustments.saturation)}%)
      sepia(${adjustments.temperature > 0 ? adjustments.temperature : 0}%)
      hue-rotate(${
        adjustments.temperature < 0 ? adjustments.temperature : 0
      }deg)
    `;

    // 3. 두 가지를 합쳐 반환
    return `${baseFilter} ${adjustFilter}`;
  };

  const handleBack = () => {
    if (step === "final") {
      if (contentType === "reels") {
        setStep("select");
        setPreview(null);
        setOriginalFile(null);
        setFinalFile(null);
      } else {
        // 필터 단계로 돌아갈 때 롤백 수행
        setStep("filter");

        // 미리보기를 다시 '자르기만 했던 원본'으로 교체
        setPreview(URL.createObjectURL(originalFile));

        setFinalFile(null);
      }
    } else if (step === "filter") {
      setStep("crop");
    } else if (step === "crop") {
      setStep("select");
      setPreview(null);
      setOriginalFile(null);
    } else if (step === "select") {
      // select 단계에서는 모달 닫기
      handleClose();
    }
  };

  const handlePost = async () => {
    // 파일 존재 유무 확인
    if (!finalFile) {
      alert("업로드할 이미지가 없습니다.");
      return;
    }

    // 업로드 시작 시 로딩 켜기
    setIsUploading(true);

    try {
      // 서버로 보낼 FormData 만들기
      const formData = new FormData();

      // 모바일에서 Blob 타입 처리 추가
      let uploadFile = finalFile;
      if (finalFile instanceof Blob && !(finalFile instanceof File)) {
        uploadFile = new File([finalFile], "upload.jpg", {
          type: "image/jpeg",
        });
      }

      formData.append("images", uploadFile); // 다 적용된 최종 파일
      formData.append("content", caption); // 글
      // postType을 명시적으로 추가해야 벡엔드가 구분
      formData.append("postType", contentType === "reels" ? "reel" : "feed");

      await createPost(formData);

      alert("게시물이 업로드 되었습니다!");
      navigate("/normal/home");
    } catch (error) {
      console.error("업로드 에러:", error);
      alert(
        `업로드 실패: ${error.message || "알 수 없는 오류가 발생했습니다."}`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    navigate("/normal/home");
  };

  const handleAdjustmentChange = (key, value) => {
    setAdjustments((prev) => ({ ...prev, [key]: value }));
  };

  // 이미지 변환 함수
  const processImage = (file, filterType) => {
    return new Promise((resolve, reject) => {
      // 1. 이미지를 로드하는 도구
      const img = new Image();
      img.src = URL.createObjectURL(file);

      // 2. 로드 후 작업 시작
      img.onload = () => {
        // 가상 캔버스 생성
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // 캔버스 크기를 이미지 크기에 맞추기
        canvas.width = img.width;
        canvas.height = img.height;

        // 필터 효과 적용
        const filterCss = FILTER_STYLES[filterType] || "";

        // 슬라이더 조정값 CSS 만들기
        const adjustmentCss = `
          brightness(${100 + parseInt(adjustments.brightness)}%)
          contrast(${100 + parseInt(adjustments.contrast)}%)
          saturate(${100 + parseInt(adjustments.saturation)}%)
          sepia(${adjustments.temperature > 0 ? adjustments.temperature : 0}%)
          hue-rotate(${
            adjustments.temperature < 0 ? adjustments.temperature : 0
          }deg)
        `;

        ctx.filter = `${filterCss} ${adjustmentCss}`.trim();

        // 이미지를 캔버스에 그리기(필터 적용 지점)
        ctx.drawImage(img, 0, 0, img.width, img.height);

        // 3. 캔버스 내용을 파일로 변환
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("이미지 변환 실패"));
              return;
            }

            // 원본 파일명 유지
            const processedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(processedFile); // 성공 후 반환
          },
          "image/jpeg",
          0.9
        );
      };
      img.onerror = (err) => reject(err);
    });
  };

  // 모바일 감지 함수
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  // 카메라 버튼 클릭 시 분기 처리 (모바일 vs PC)
  const handleCameraClick = () => {
    if (isMobileDevice()) {
      mobileCameraInputRef.current?.click();
    } else {
      setShowCamera(true);
    }
  };

  // 카메라로 찍은 사진 처리 함수 추가
  const handleCameraCapture = (file) => {
    if (file) {
      setOriginalFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      setStep("crop");
    }
  };

  return (
    <>
      <LeftSidebar />
      <RightSidebar />

      {/* 카메라 모달 */}
      {showCamera && (
        <CameraModal
          onClose={() => setShowCamera(false)}
          onCapture={handleCameraCapture}
        />
      )}

      <Overlay onClick={handleClose}>
        <Modal
          onClick={(e) => e.stopPropagation()}
          $step={step}
          $darkMode={isDarkMode}
        >
          <ModalHeader $darkMode={isDarkMode}>
            <BackButton onClick={handleBack}>
              <ArrowLeft size={20} />
            </BackButton>
            <ModalTitle $darkMode={isDarkMode}>
              {step === "select" &&
                (contentType === "reels"
                  ? "새 릴스 만들기"
                  : "새 게시물 만들기")}
              {step === "crop" && "자르기"}
              {step === "filter" && "편집"}
              {step === "final" &&
                (contentType === "reels"
                  ? "새 릴스 만들기"
                  : "새 게시물 만들기")}
            </ModalTitle>
            {(step === "crop" || step === "filter") && (
              <NextButton onClick={handleNext}>다음</NextButton>
            )}
            {step === "final" && (
              <ShareButton onClick={handlePost}>공유하기</ShareButton>
            )}
          </ModalHeader>

          {step === "select" && (
            <TabContainer>
              <Tab
                $active={contentType === "photo"}
                onClick={() => setContentType("photo")}
              >
                사진
              </Tab>
              <Tab
                $active={contentType === "reels"}
                onClick={() => setContentType("reels")}
              >
                릴스
              </Tab>
            </TabContainer>
          )}

          {step === "select" && (
            <UploadSection>
              <IconContainer>
                {contentType === "photo" ? <span>📷</span> : <span>🎬</span>}
              </IconContainer>
              <UploadText $darkMode={isDarkMode}>
                {contentType === "photo"
                  ? "사진을 여기에 끌어다 놓으세요"
                  : "동영상을 여기에 끌어다 놓으세요"}
              </UploadText>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center",
                }}
              >
                <SelectButton onClick={() => fileInputRef.current?.click()}>
                  컴퓨터에서 선택
                </SelectButton>
                {contentType === "photo" && (
                  <SelectButton
                    onClick={handleCameraClick}
                    $darkMode={isDarkMode}
                    $isCameraButton
                  >
                    사진 촬영
                  </SelectButton>
                )}
              </div>
              <input
                ref={mobileCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment" // 핵심: 후면 카메라 바로 실행
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
              {/* 기존 파일 선택 Input [유지] */}
              <input
                ref={fileInputRef}
                type="file"
                accept={contentType === "photo" ? "image/*" : "video/*"}
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </UploadSection>
          )}

          {step === "crop" && preview && (
            <>
              <PreviewSection
                style={{
                  padding: 0,
                  overflow: "hidden",
                  backgroundColor: "#000",
                }}
              >
                {contentType === "reels" ? (
                  <ReelsFrame>
                    <PreviewVideo
                      key={preview}
                      src={preview}
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  </ReelsFrame>
                ) : (
                  // 라이브러리 사용
                  <CropperWrapper>
                    <Cropper
                      image={preview}
                      crop={crop}
                      zoom={zoom}
                      aspect={aspectRatio || originalAspect}
                      onCropChange={setCrop}
                      onCropComplete={onCropComplete}
                      onZoomChange={setZoom}
                      onMediaLoaded={onMediaLoaded}
                      objectFit="contain"
                    />
                  </CropperWrapper>
                )}
              </PreviewSection>
              {contentType === "photo" && (
                <CropToolbar>
                  {/* 원본 비율로 되돌리기 */}
                  <CropButton onClick={() => setAspectRatio(null)}>
                    <Maximize2 size={20} />
                  </CropButton>

                  {/* 1:1 */}
                  <CropButton onClick={() => setAspectRatio(1)}>1:1</CropButton>
                  {/* 4:5 */}
                  <CropButton onClick={() => setAspectRatio(4 / 5)}>
                    4:5
                  </CropButton>
                  {/* 16:9 */}
                  <CropButton onClick={() => setAspectRatio(16 / 9)}>
                    16:9
                  </CropButton>

                  {/* 줌 슬라이더 */}
                  <div
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span style={{ fontSize: "12px" }}>🔍</span>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(e.target.value)}
                      style={{ width: "min(80px, 30vw)" }}
                    />
                  </div>
                </CropToolbar>
              )}
            </>
          )}

          {step === "filter" && preview && contentType === "photo" && (
            <FilterContainer>
              <FilterLeft>
                <PreviewImageLarge
                  src={preview}
                  alt="Preview"
                  style={{
                    // 필터 + 조정값 모두 적용
                    filter: getAppliedFilterStyle(),
                  }}
                />
              </FilterLeft>
              <FilterRight>
                <FilterTabs>
                  <FilterTab
                    $active={editTab === "filter"}
                    onClick={() => setEditTab("filter")}
                  >
                    필터
                  </FilterTab>
                  <FilterTab
                    $active={editTab === "adjust"}
                    onClick={() => setEditTab("adjust")}
                  >
                    조정
                  </FilterTab>
                </FilterTabs>

                {editTab === "filter" && (
                  <FilterGrid>
                    {FILTERS.map((filter) => (
                      <FilterOption
                        key={filter.value}
                        onClick={() => setSelectedFilter(filter.value)}
                        $active={selectedFilter === filter.value}
                      >
                        <FilterPreview
                          src={preview}
                          alt={filter.name}
                          style={{
                            // 필터값과 조정값을 합쳐서 보여줌
                            filter: `${FILTER_STYLES[filter.value]}
                            brightness(${
                              100 + parseInt(adjustments.brightness)
                            }%)
                            contrast(${100 + parseInt(adjustments.contrast)}%)
                            saturate(${
                              100 + parseInt(adjustments.saturation)
                            }%)`,
                          }}
                        />
                        <FilterName>{filter.name}</FilterName>
                      </FilterOption>
                    ))}
                  </FilterGrid>
                )}

                {editTab === "adjust" && (
                  <AdjustmentPanel>
                    <AdjustmentItem>
                      <AdjustmentLabel>밝기</AdjustmentLabel>
                      <AdjustmentSlider
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustments.brightness}
                        onChange={(e) =>
                          handleAdjustmentChange("brightness", e.target.value)
                        }
                      />
                      <AdjustmentValue>
                        {adjustments.brightness}
                      </AdjustmentValue>
                    </AdjustmentItem>

                    <AdjustmentItem>
                      <AdjustmentLabel>대비</AdjustmentLabel>
                      <AdjustmentSlider
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustments.contrast}
                        onChange={(e) =>
                          handleAdjustmentChange("contrast", e.target.value)
                        }
                      />
                      <AdjustmentValue>{adjustments.contrast}</AdjustmentValue>
                    </AdjustmentItem>

                    <AdjustmentItem>
                      <AdjustmentLabel>채도</AdjustmentLabel>
                      <AdjustmentSlider
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustments.saturation}
                        onChange={(e) =>
                          handleAdjustmentChange("saturation", e.target.value)
                        }
                      />
                      <AdjustmentValue>
                        {adjustments.saturation}
                      </AdjustmentValue>
                    </AdjustmentItem>

                    <AdjustmentItem>
                      <AdjustmentLabel>온도</AdjustmentLabel>
                      <AdjustmentSlider
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustments.temperature}
                        onChange={(e) =>
                          handleAdjustmentChange("temperature", e.target.value)
                        }
                      />
                      <AdjustmentValue>
                        {adjustments.temperature}
                      </AdjustmentValue>
                    </AdjustmentItem>
                  </AdjustmentPanel>
                )}
              </FilterRight>
            </FilterContainer>
          )}

          {step === "final" && preview && (
            <FinalContainer>
              <FinalLeft>
                {contentType === "reels" ? (
                  // 🎥 [릴스] .mov 파일인지 체크
                  finalFile?.name.toLowerCase().endsWith(".mov") ||
                  finalFile?.type === "video/quicktime" ? (
                    // 1️⃣ .mov 파일일 경우: 미리보기 대신 안내 화면 표시
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        background: "#111",
                        color: "#fff",
                        textAlign: "center",
                        gap: "20px",
                      }}
                    >
                      <span style={{ fontSize: "min(50px, 12vw)" }}>🎬</span>
                      <div>
                        <p
                          style={{
                            fontSize: "min(18px, 4vw)",
                            fontWeight: "bold",
                            marginBottom: "8px",
                          }}
                        >
                          동영상 미리보기 불가
                        </p>
                        <p style={{ fontSize: "14px", color: "#aaa" }}>
                          .mov 파일은 브라우저에서 재생할 수 없어요.
                          <br />
                          하지만 <b>업로드는 정상적으로 됩니다!</b>
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* 2️⃣ .mp4 등 일반 파일이면: 영상 재생 */
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: "#000",
                        overflow: "hidden",
                      }}
                    >
                      <video
                        key={preview} // 소스 바뀔 때 새로고침
                        src={preview}
                        style={{
                          width: "auto",
                          height: "auto",
                          maxWidth: "100%",
                          maxHeight: "100%",
                        }}
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    </div>
                  )
                ) : (
                  /* 📷 [사진 로직] */
                  <PreviewImageFinal
                    src={preview}
                    alt="Preview"
                    style={{ objectFit: "contain" }}
                  />
                )}
              </FinalLeft>

              {/* 👇 오른쪽 텍스트 입력창 (기존 그대로 유지) */}
              <FinalRight>
                <UserInfo>
                  <Avatar>
                    {user?.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt="프로필"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      "👤"
                    )}
                  </Avatar>
                  <Username>{user?.username || "사용자"}</Username>
                </UserInfo>

                <CaptionTextarea
                  placeholder="문구 입력..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={2200}
                />

                <CharCount>{caption.length}/2,200</CharCount>
              </FinalRight>
            </FinalContainer>
          )}
        </Modal>
      </Overlay>
      {/* 업로드 중일 때 뜨는 전체화면 로딩창 */}
      {isUploading && (
        <LoadingOverlay>
          <SpinningLoader>
            <Loader2 size={48} color="#fff" />
          </SpinningLoader>
          <LoadingText>
            게시물을 업로드하고 있습니다...
            <br />
            (동영상은 시간이 조금 걸릴 수 있어요)
          </LoadingText>
        </LoadingOverlay>
      )}
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
  background: ${(props) => (props.$darkMode ? "#262626" : "white")};
  border-radius: 12px;
  width: ${(props) =>
    props.$step === "filter" || props.$step === "final" ? "90%" : "540px"};
  max-width: ${(props) =>
    props.$step === "filter" || props.$step === "final" ? "960px" : "540px"};
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 767px) {
    width: 100%;
    /* 전체 높이에서 안전영역 분리. 상단/하단 안전영역을 고려하고 내부 스크롤을 허용 */
    height: calc(
      100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)
    );
    max-width: none;
    max-height: none;
    border-radius: 0; /* 둥근 모서리 제거 */
    aspect-ratio: auto; /* 비율 해제 */
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    box-sizing: border-box;
    overflow-y: auto;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  border-bottom: 1px solid ${(props) => (props.$darkMode ? "#000" : "#dbdbdb")};
  position: relative;
  min-height: 43px;

  @media (max-width: 767px) {
    padding-top: calc(12px + env(safe-area-inset-top, 0px));
    padding-bottom: 12px;
    min-height: 56px;
  }
`;

const BackButton = styled.button`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  padding: 8px;
  color: #0095f6;
  cursor: pointer;
  outline: none;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
  z-index: 10;
  min-width: 44px;
  min-height: 44px;

  &:hover {
    opacity: 0.7;
  }

  svg {
    width: 24px;
    height: 24px;
  }
`;

const ModalTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  flex: 1;
  text-align: center;
`;

const NextButton = styled.button`
  position: absolute;
  right: 16px;
  font-size: 14px;
  color: #0095f6;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  border: none;
  background: transparent;

  &:hover {
    color: #00376b;
  }
`;

const ShareButton = styled.button`
  position: absolute;
  right: 16px;
  font-size: 14px;
  color: #0095f6;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  border: none;
  background: transparent;

  &:hover {
    color: #00376b;
  }
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #dbdbdb;
  background: #fafafa;
`;

const Tab = styled.button`
  flex: 1;
  padding: 14px;
  font-size: 15px;
  font-weight: ${(props) => (props.$active ? "700" : "500")};
  color: ${(props) => (props.$active ? "#262626" : "#8e8e8e")};
  background: ${(props) => (props.$active ? "#fff" : "transparent")};
  border: none;
  border-bottom: ${(props) =>
    props.$active ? "2px solid #262626" : "2px solid transparent"};
  cursor: pointer;
  transition: all 0.2s;
  outline: none;

  &:hover {
    color: #262626;
    background: ${(props) =>
      props.$active ? "#fff" : "rgba(255, 255, 255, 0.5)"};
  }
`;

const UploadSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  min-height: 500px;

  @media (max-width: 767px) {
    padding: 24px 12px;
    min-height: auto;
    padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  }
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  height: 80px;
  color: #262626;

  span {
    font-size: 60px;
  }

  @media (max-width: 767px) {
    height: 60px;
    span {
      font-size: 44px;
    }
  }
`;

const UploadText = styled.p`
  font-size: 22px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  margin-bottom: 24px;
  text-align: center;
`;

const SelectButton = styled.button`
  background: ${(props) =>
    props.$isCameraButton ? (props.$darkMode ? "#fff" : "#262626") : "#0095f6"};
  color: ${(props) =>
    props.$isCameraButton ? (props.$darkMode ? "#262626" : "white") : "white"};
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  outline: none;
  border: ${(props) =>
    props.$isCameraButton && props.$darkMode ? "1px solid #dbdbdb" : "none"};

  &:hover {
    background: ${(props) =>
      props.$isCameraButton
        ? props.$darkMode
          ? "#f0f0f0"
          : "#000"
        : "#1877f2"};
  }

  &:active {
    transform: scale(0.95);
  }
`;

const PreviewSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  min-height: 360px;
  max-height: 70vh;
  position: relative;
  padding: 24px;

  @media (max-width: 1024px) {
    min-height: 320px;
  }

  @media (max-width: 767px) {
    min-height: auto;
    height: 70vh;
    max-height: none;
    padding: 16px 12px;
  }
`;

const PreviewImage = styled.img`
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
`;

/* 크로퍼 래퍼: 인라인 높이 대신 여기서 제어. 모바일에서는 헤더/컨트롤을 고려해 높이 계산 */
const CropperWrapper = styled.div`
  position: relative;
  width: 100%;
  height: min(60vh, 500px);
  background-color: #333;
  overflow: hidden;

  @media (max-width: 767px) {
    /* 모달 헤더(약 56px) + 하단 컨트롤을 고려하여 동적으로 계산 */
    height: calc(100vh - 160px - env(safe-area-inset-bottom, 0px));
    max-height: calc(70vh - env(safe-area-inset-bottom, 0px));
  }
`;

const ReelsFrame = styled.div`
  width: 100%;
  max-width: 360px;
  aspect-ratio: 9 / 16;
  position: relative;
  background: #000;
  overflow: hidden;
  border-radius: 8px;
  max-height: 80vh;

  img,
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 767px) {
    max-width: 90vw;
    max-height: 75vh;
  }
`;

const PreviewVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const CropToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px;
  border-top: 1px solid #dbdbdb;
  background: white;
`;

const CropButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border: 1px solid #dbdbdb;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #262626;
  transition: all 0.2s;
  outline: none;
  background: white;

  &:hover {
    background: #fafafa;
  }
`;

const FilterContainer = styled.div`
  display: flex;
  height: min(84vh, 720px);
  overflow: hidden;

  @media (max-width: 1024px) {
    height: min(78vh, 660px);
  }

  @media (max-width: 767px) {
    flex-direction: column;
    height: auto;
    max-height: calc(100vh - 140px - env(safe-area-inset-bottom, 0px));
    overflow-y: auto;
  }
`;

const FilterLeft = styled.div`
  flex: 1;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  min-height: 0;
`;

const PreviewImageLarge = styled.img`
  max-width: 100%;
  max-height: 720px;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;

  @media (max-width: 1024px) {
    max-height: 660px;
  }

  @media (max-width: 767px) {
    max-height: 60vh;
    object-fit: contain;
  }
`;

const FilterRight = styled.div`
  width: 340px;
  border-left: 1px solid #dbdbdb;
  display: flex;
  flex-direction: column;
  background: white;
  overflow: hidden;
  flex-shrink: 0;

  @media (max-width: 1024px) {
    width: 280px;
  }

  @media (max-width: 767px) {
    width: 100%;
    border-left: none;
    border-top: 1px solid #dbdbdb;
    max-height: 40vh;
    overflow-y: auto;
  }
`;

const FilterTabs = styled.div`
  display: flex;
  border-bottom: 1px solid #dbdbdb;
`;

const FilterTab = styled.button`
  flex: 1;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$active ? "#262626" : "#8e8e8e")};
  border: none;
  border-bottom: ${(props) => (props.$active ? "1px solid #262626" : "none")};
  cursor: pointer;
  transition: all 0.2s;
  outline: none;
  background: transparent;

  &:hover {
    color: #262626;
  }
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  column-gap: 0;
  row-gap: 0;
  background: white;
  overflow-y: auto;
  height: 100%;
  flex: 1;
  scroll-behavior: smooth;
  padding: 0;

  @media (max-width: 767px) {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    overflow-y: auto;
    overflow-x: hidden;
    max-height: none;
    height: 100%;
    padding: 0;
    gap: 0;
  }
`;

const FilterOption = styled.div`
  background: white;
  cursor: pointer;
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border: ${(props) => (props.$active ? "2px solid #0095f6" : "none")};
  flex-shrink: 0;

  &:hover {
    opacity: 0.8;
  }

  @media (max-width: 767px) {
    aspect-ratio: 1;
  }
`;

const FilterPreview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const FilterName = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  font-size: 11px;
  text-align: center;
`;

const AdjustmentPanel = styled.div`
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 22px;
  overflow-y: auto;
  height: 100%;
  flex: 1;

  @media (max-width: 767px) {
    gap: 14px;
    padding: 12px;
    height: auto;
  }
`;

const AdjustmentItem = styled.div`
  margin-bottom: 0;
`;

const AdjustmentLabel = styled.div`
  font-size: 14px;
  color: #262626;
  margin-bottom: 8px;
  font-weight: 500;
`;

const AdjustmentSlider = styled.input`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: #dbdbdb;
  outline: none;
  border: none;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #262626;
    cursor: pointer;
    border: none;
    outline: none;
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #262626;
    cursor: pointer;
    border: none;
    outline: none;
  }
`;

const AdjustmentValue = styled.div`
  text-align: right;
  font-size: 12px;
  color: #8e8e8e;
  margin-top: 4px;
`;

const FinalContainer = styled.div`
  display: flex;
  height: min(70vh, 600px);
  overflow: hidden;

  @media (max-width: 767px) {
    flex-direction: column;
    height: auto;
    max-height: 80vh; /* 모달 크기 내에서 */
    overflow-y: auto; /* 스크롤 가능하게 변경 */
  }
`;

const FinalLeft = styled.div`
  flex: 1;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;

  @media (max-width: 767px) {
    width: 100%;
    padding: 16px 12px;
    min-height: 40vh;
    flex: none; /* 남은 공간 다 차지하지 않게 설정 */
    height: auto;
    max-height: calc(60vh - env(safe-area-inset-bottom, 0px));
  }
`;

const PreviewImageFinal = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const FinalRight = styled.div`
  width: 340px;
  border-left: 1px solid #dbdbdb;
  display: flex;
  flex-direction: column;
  background: white;
  overflow-y: auto;

  @media (max-width: 767px) {
    width: 100%;
    flex: none; /* 크기 축소 방지 */
    border-left: none;
    border-top: 1px solid #dbdbdb;
    height: auto; /* 내용물만큼 높이 확보 */
    min-height: 200px; /* 최소 높이 보장 */
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #efefef;
`;

const Avatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #fafafa;
  border: 1px solid #dbdbdb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
`;

const Username = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #262626;
`;

const CaptionTextarea = styled.textarea`
  padding: 16px;
  border: none;
  border-bottom: 1px solid #efefef;
  font-size: 14px;
  color: white;
  background: #262626;
  resize: none;
  font-family: inherit;
  min-height: 120px;
  outline: none;

  &::placeholder {
    color: #8e8e8e;
  }

  &:focus {
    outline: none;
  }
`;

const CharCount = styled.div`
  padding: 8px 16px;
  font-size: 12px;
  color: #8e8e8e;
  text-align: right;
  border-bottom: 1px solid #efefef;
`;

const OptionsList = styled.div`
  display: flex;
  flex-direction: column;
`;

const OptionItem = styled.div`
  padding: 16px;
  border-bottom: 1px solid #efefef;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #fafafa;
  }
`;

const OptionLabel = styled.div`
  font-size: 14px;
  color: #262626;
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8); /* 배경을 어둡게 */
  z-index: 9999; /* 모달보다 더 위에 뜨도록 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding-bottom: env(safe-area-inset-bottom, 0px);
`;

// 빙글빙글 도는 애니메이션
const SpinningLoader = styled.div`
  animation: spin 1s linear infinite;

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.p`
  color: white;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  line-height: 1.5;
`;

export default Upload;
