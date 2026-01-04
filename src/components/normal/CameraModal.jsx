import React, { useRef, useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { X, RefreshCw } from "lucide-react";

const CameraModal = ({ onClose, onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState("user"); // 'user' or 'environment'

  // 카메라 스트림 정리 함수
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // 카메라 종료 후 onClose 호출
  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  const startCamera = useCallback(async () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          aspectRatio: { ideal: 1 },
        },
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("카메라 접근 오류:", err);
      alert("카메라를 실행할 수 없습니다. 권한을 확인해주세요.");
      handleClose();
    }
  }, [facingMode, handleClose, stream]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // 컴포넌트 언마운트 시 카메라 정리
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      const context = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // 전면 카메라일 때 좌우반전하여 정상적으로 저장
      if (facingMode === "user") {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          const file = new File([blob], `capture_${Date.now()}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

          // 카메라 스트림 정리
          stopCamera();

          onCapture(file);
          onClose();
        },
        "image/jpeg",
        0.9
      );
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  return (
    <Overlay>
      <Container>
        {/* 카메라 화면 */}
        <Video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          $isFlipped={facingMode === "user"}
        />

        {/* 캡처용 숨겨진 캔버스 */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <Controls>
          {/* 취소 버튼 */}
          <ActionButton onClick={handleClose}>
            <IconCircle>
              <X size={24} color="#fff" />
            </IconCircle>
            <ButtonLabel>취소</ButtonLabel>
          </ActionButton>

          {/* 촬영 버튼 */}
          <CaptureGroup onClick={handleCapture}>
            <ShutterButtonOuter>
              <ShutterButtonInner />
            </ShutterButtonOuter>
            <ButtonLabel>촬영</ButtonLabel>
          </CaptureGroup>

          {/* 전환 버튼 */}
          <ActionButton onClick={toggleCamera}>
            <IconCircle>
              <RefreshCw size={24} color="#fff" />
            </IconCircle>
            <ButtonLabel>전환</ButtonLabel>
          </ActionButton>
        </Controls>
      </Container>
    </Overlay>
  );
};

export default CameraModal;

// --- 스타일 정의 ---

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: contain; /* 비율 유지하며 화면에 맞춤 */
  transform: ${(props) => (props.$isFlipped ? "scaleX(-1)" : "none")};

  @media (max-width: 767px) {
    object-fit: cover; /* 모바일에서는 화면 채움 */
  }
`;

const Controls = styled.div`
  position: absolute;
  /* 배너에 가려지지 않도록 바닥에서 넉넉하게 띄움 */
  bottom: 150px;
  width: 100%;
  display: flex;
  justify-content: space-evenly; /* 버튼 간격 균등 배치 */
  align-items: flex-end; /* 아래쪽 라인 맞춤 */
  padding: 0 20px;
  z-index: 10000; /* 최상위로 올림 */

  @media (max-width: 767px) {
    bottom: 80px; /* 모바일에서는 더 낮게 */
    padding: 0 12px;
  }
`;

// 취소/전환 버튼 래퍼
const ActionButton = styled.button`
  background: transparent;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  &:active {
    opacity: 0.7;
  }
`;

// 아이콘 감싸는 원
const IconCircle = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2); /* 반투명 배경 */
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);

  @media (max-width: 767px) {
    width: 40px;
    height: 40px;
  }
`;

// 텍스트 라벨
const ButtonLabel = styled.span`
  color: white;
  font-size: 14px;
  font-weight: 500;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5); /* 글씨 잘 보이게 그림자 */
`;

// 촬영 버튼 그룹
const CaptureGroup = styled.button`
  background: transparent;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-bottom: -4px; /* 시각적 정렬 보정 */

  &:active {
    transform: scale(0.95);
  }
`;

// 촬영 버튼 바깥 원
const ShutterButtonOuter = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 4px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);

  @media (max-width: 767px) {
    width: 56px;
    height: 56px;
    border: 3px solid white;
  }
`;

// 촬영 버튼 안쪽 원
const ShutterButtonInner = styled.div`
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: white;

  @media (max-width: 767px) {
    width: 44px;
    height: 44px;
  }
`;
