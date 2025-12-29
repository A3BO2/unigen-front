import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { ChevronLeft } from "lucide-react";
import { updatePost } from "../../services/post";
import { useApp } from "../../context/AppContext";

const PostUpdate = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { isDarkMode } = useApp();

  const { content: oldContent, imageUrl } = location.state || {};

  const [content, setContent] = useState(oldContent || "");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!content.trim()) return alert("내용을 입력해주세요.");

    setLoading(true);
    try {
      await updatePost(id, content);
      alert("게시물이 수정되었습니다.");
      navigate("/normal/home");
    } catch (error) {
      console.error(error);
      alert("수정에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container $darkMode={isDarkMode}>
      <Header $darkMode={isDarkMode}>
        <BackButton onClick={() => navigate(-1)} $darkMode={isDarkMode}>
          <ChevronLeft size={28} />
        </BackButton>
        <Title $darkMode={isDarkMode}>정보 수정</Title>
        <SaveButton onClick={handleUpdate} disabled={loading}>
          {loading ? "저장 중..." : "완료"}
        </SaveButton>
      </Header>

      <ContentArea>
        {/* 이미지 미리보기 영역 */}
        {imageUrl && (
          <ImagePreviewWrapper $darkMode={isDarkMode}>
            <PreviewImage src={imageUrl} alt="preview" />
          </ImagePreviewWrapper>
        )}

        {/* 텍스트 입력 영역 (회색 배경) */}
        <TextSection $darkMode={isDarkMode}>
          {/* 실제 입력칸 (흰색 둥근 박스) */}
          <TextInput
            $darkMode={isDarkMode}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="문구를 입력하세요..."
            autoFocus
          />
        </TextSection>
      </ContentArea>
    </Container>
  );
};

// --- 스타일 컴포넌트 ---

const Container = styled.div`
  max-width: 630px;
  margin: 0 auto;
  min-height: 100vh;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  display: flex;
  flex-direction: column;

  @media (max-width: 767px) {
    max-width: 100%;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    box-sizing: border-box;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid
    ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  position: sticky;
  top: 0;
  z-index: 10;

  @media (max-width: 767px) {
    padding-top: calc(12px + env(safe-area-inset-top, 0px));
    top: env(safe-area-inset-top, 0px);
  }
`;

const BackButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const Title = styled.h1`
  font-size: 16px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
`;

const SaveButton = styled.button`
  background: none;
  border: none;
  color: #0095f6;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }

  &:hover:not(:disabled) {
    color: #00376b;
  }
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const ImagePreviewWrapper = styled.div`
  width: 100%;
  max-height: 400px;
  background: ${(props) => (props.$darkMode ? "#121212" : "#f8f8f8")};
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border-bottom: 1px solid
    ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
`;

const PreviewImage = styled.img`
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
`;

// [신규] 텍스트 섹션 (회색 배경 영역)
const TextSection = styled.div`
  flex: 1; /* 남은 공간을 모두 차지 */
  background-color: ${(props) =>
    props.$darkMode ? "#000" : "#f5f5f5"}; /* 옅은 회색 */
  padding: 1rem; /* 흰색 박스와의 거리 */
`;

// [수정] 텍스트 입력창 (흰색 둥근 박스)
const TextInput = styled.textarea`
  width: 100%;
  height: 100%; /* TextSection 내부를 꽉 채움 */
  min-height: 250px;
  border: none;
  resize: none;
  font-size: 16px;
  line-height: 1.6;
  padding: 20px; /* 텍스트 내부 여백 */
  outline: none;

  /* 둥근 흰색 박스 스타일 */
  background: ${(props) => (props.$darkMode ? "#262626" : "#fff")};
  border-radius: 12px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};

  /* 입체감을 위한 그림자 (선택사항) */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &::placeholder {
    color: ${(props) => (props.$darkMode ? "#888" : "#ccc")};
  }
`;

export default PostUpdate;
