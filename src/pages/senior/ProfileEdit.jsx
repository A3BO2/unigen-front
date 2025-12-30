import { useState, useEffect, useRef } from "react";
import styled, { ThemeProvider } from "styled-components";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import SeniorBottomNav from "../../components/senior/BottomNav";
import {
  getCurrentUser,
  updateUserProfile,
  uploadProfileImage,
} from "../../services/user";

const baseURL = import.meta.env.VITE_BASE_URL;
if (!baseURL) {
  throw new Error("VITE_BASE_URL 환경변수가 설정되지 않았습니다.");
}

// 이미지 URL을 절대 경로로 변환하는 함수
const getImageUrl = (url) => {
  if (!url) return null;
  // 이미 http:// 또는 https://로 시작하면 그대로 반환
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // 상대 경로면 baseURL 붙이기
  return `${baseURL}${url}`;
};

const SeniorProfileEdit = () => {
  const navigate = useNavigate();
  const { isDarkMode, user, login, mode } = useApp();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    username: user?.username || "",
    profile_image: user?.profile_image || "",
  });
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // 서버에서 최신 프로필 한번 더 가져와서 초기값 동기화
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getCurrentUser();
        if (data?.profile) {
          setFormData((prev) => ({
            ...prev,
            name: data.profile.name || prev.name,
            username: data.profile.username || prev.username,
            profile_image: data.profile.profile_image || prev.profile_image,
          }));
        }
      } catch (e) {
        console.error("프로필 불러오기 실패:", e);
      }
    };

    loadProfile();
  }, []);

  // 컴포넌트 언마운트 시 미리보기 URL 정리
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일만 허용
    if (!file.type.startsWith("image/")) {
      return;
    }

    // 파일을 state에 저장하고 미리보기 생성
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // 선택된 파일이 있으면 먼저 업로드
      let uploadedImageUrl = formData.profile_image;
      if (selectedFile) {
        try {
          const uploadResult = await uploadProfileImage(selectedFile);
          if (uploadResult?.imageUrl) {
            uploadedImageUrl = uploadResult.imageUrl;
          }
        } catch (uploadError) {
          console.error("이미지 업로드 실패:", uploadError);
          setLoading(false);
          return;
        }
      }

      // 프로필 업데이트 (username 포함, 업로드된 이미지 URL 포함)
      const profileUpdateData = {
        ...formData,
        profile_image: uploadedImageUrl,
      };
      const updated = await updateUserProfile(profileUpdateData);

      // AppContext의 user도 업데이트 (이름/프로필 이미지 반영)
      if (updated?.data?.user) {
        login(
          {
            ...(user || {}),
            ...updated.data.user,
          },
          mode || "senior"
        );
      }

      // 미리보기 URL 정리 및 상태 초기화
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);

      navigate("/senior/profile");
    } catch (error) {
      console.error("프로필 수정 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={{ $darkMode: isDarkMode }}>
      <Container $darkMode={isDarkMode}>
        <Header $darkMode={isDarkMode}>
          <BackButton onClick={() => navigate("/senior/profile")}>
            <ChevronLeft size={32} strokeWidth={2.5} />
          </BackButton>
          <Title>프로필 수정</Title>
          <Spacer />
        </Header>

        <Content>
          <Form onSubmit={handleSubmit}>
            <ProfileSection>
              <AvatarContainer>
                <AvatarPreview>
                  {previewUrl ? (
                    <AvatarImage
                      src={previewUrl}
                      alt="프로필 이미지 미리보기"
                    />
                  ) : formData.profile_image ? (
                    <AvatarImage
                      src={getImageUrl(formData.profile_image)}
                      alt="프로필 이미지"
                    />
                  ) : (
                    "👤"
                  )}
                </AvatarPreview>
              </AvatarContainer>
              <ImageSelectButton
                type="button"
                onClick={handleImageSelect}
                disabled={loading}
              >
                사진 수정하기
              </ImageSelectButton>
              <HiddenFileInput
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </ProfileSection>

            <FieldGroup>
              <Label>이름</Label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="이름을 입력하세요"
              />
            </FieldGroup>

            <FieldGroup>
              <Label>사용자 이름</Label>
              <Input
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="사용자 이름을 입력하세요"
              />
            </FieldGroup>

            <SubmitButton type="submit" disabled={loading}>
              {loading ? "저장 중..." : "저장하기"}
            </SubmitButton>
          </Form>
        </Content>

        <SeniorBottomNav />
      </Container>
    </ThemeProvider>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  color: ${(props) => (props.$darkMode ? "#fff" : "#000")};
  padding-bottom: 100px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  background: ${(props) => (props.$darkMode ? "#000" : "#fff")};
  border-bottom: 2px solid
    ${(props) => (props.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  padding: 20px 24px;
  display: flex;
  align-items: center;
  z-index: 10;
`;

const BackButton = styled.button`
  color: inherit;
  padding: 4px;

  &:active {
    opacity: 0.6;
  }
`;

const Title = styled.h1`
  font-size: calc(28px * var(--font-scale, 1));
  font-weight: 700;
  flex: 1;
  text-align: center;
`;

const Spacer = styled.div`
  width: 40px;
`;

const Content = styled.div`
  padding: 24px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ProfileSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  gap: 16px;
`;

const AvatarContainer = styled.div`
  display: inline-block;
`;

const AvatarPreview = styled.div`
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#f5f5f5")};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 100px;
  border: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  overflow: hidden;
`;

const ImageSelectButton = styled.button`
  width: 200px;
  padding: 12px 16px;
  border-radius: 8px;
  background: ${(props) => (props.theme.$darkMode ? "#1a1a1a" : "#f5f5f5")};
  border: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  font-size: calc(16px * var(--font-scale, 1));
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    transform: scale(1.05);
    background: ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e8e8e8")};
    border-color: ${(props) => (props.theme.$darkMode ? "#3a3a3a" : "#0095f6")};
    color: ${(props) => (props.theme.$darkMode ? "#0095f6" : "#0095f6")};
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: calc(18px * var(--font-scale, 1));
  font-weight: 600;
`;

const Input = styled.input`
  padding: 12px 14px;
  border-radius: 10px;
  border: 2px solid
    ${(props) => (props.theme.$darkMode ? "#2a2a2a" : "#e0e0e0")};
  background: ${(props) => (props.theme.$darkMode ? "#000" : "#fff")};
  color: ${(props) => (props.theme.$darkMode ? "#fff" : "#000")};
  font-size: calc(18px * var(--font-scale, 1));

  &:focus {
    outline: none;
    border-color: #0095f6;
  }
`;

const SubmitButton = styled.button`
  margin-top: 16px;
  width: 100%;
  padding: 16px;
  border-radius: 12px;
  background: #0095f6;
  color: #fff;
  font-size: calc(20px * var(--font-scale, 1));
  font-weight: 700;

  &:active {
    opacity: 0.85;
  }
`;

export default SeniorProfileEdit;
