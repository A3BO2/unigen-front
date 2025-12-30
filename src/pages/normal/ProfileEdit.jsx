import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { ArrowLeft } from "lucide-react";
import { useApp } from "../../context/AppContext";
import LeftSidebar from "../../components/normal/LeftSidebar";
import RightSidebar from "../../components/normal/RightSidebar";
import BottomNav from "../../components/normal/BottomNav";
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

const ProfileEdit = () => {
  const { user, isDarkMode, login, mode } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    username: user?.username || "",
    profile_image: user?.profile_image || "",
    email: user?.email || "",
    phone: user?.phone || "",
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
            email: data.profile.email || prev.email,
            phone: data.profile.phone || prev.phone,
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
      alert("이미지 파일만 업로드할 수 있습니다.");
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
          alert("프로필 사진 업로드에 실패했습니다.");
          setLoading(false);
          return;
        }
      }

      // 프로필 업데이트 (email, phone 제외, 업로드된 이미지 URL 포함)
      // eslint-disable-next-line no-unused-vars
      const { email, phone, ...updateData } = formData;
      const profileUpdateData = {
        ...updateData,
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
          mode || "normal"
        );
      }

      // 미리보기 URL 정리 및 상태 초기화
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);

      navigate("/normal/profile");
    } catch (error) {
      console.error("프로필 수정 실패:", error);
      alert("프로필 수정에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LeftSidebar />
      <RightSidebar />
      <BottomNav />

      <Container $darkMode={isDarkMode}>
        <MobileHeader $darkMode={isDarkMode}>
          <BackButton onClick={() => navigate("/normal/profile")}>
            <ArrowLeft size={24} color={isDarkMode ? "#fff" : "#262626"} />
          </BackButton>
          <HeaderTitle $darkMode={isDarkMode}>프로필 편집</HeaderTitle>
          <SubmitButton onClick={handleSubmit} disabled={loading}>
            {loading ? "저장 중..." : "완료"}
          </SubmitButton>
        </MobileHeader>

        <MainContent $darkMode={isDarkMode}>
          <Header $darkMode={isDarkMode}>
            <Title $darkMode={isDarkMode}>프로필 편집</Title>
          </Header>

          <Form onSubmit={handleSubmit}>
            <ProfileSection $darkMode={isDarkMode}>
              <ProfileImageWrapper>
                {previewUrl ? (
                  <ProfileImage
                    src={previewUrl}
                    alt="프로필 이미지 미리보기"
                    $darkMode={isDarkMode}
                  />
                ) : formData.profile_image ? (
                  <ProfileImage
                    src={getImageUrl(formData.profile_image)}
                    alt="프로필 이미지"
                    $darkMode={isDarkMode}
                  />
                ) : (
                  <ProfileImagePlaceholder $darkMode={isDarkMode}>
                    👤
                  </ProfileImagePlaceholder>
                )}
              </ProfileImageWrapper>
              <ChangePhotoButton
                type="button"
                $darkMode={isDarkMode}
                onClick={handleImageSelect}
                disabled={loading}
              >
                프로필 사진 바꾸기
              </ChangePhotoButton>
              <HiddenFileInput
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
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
                disabled={loading}
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
                disabled={loading}
              />
            </FormGroup>

            <Divider $darkMode={isDarkMode} />

            <FormGroup>
              <Label $darkMode={isDarkMode}>이메일</Label>
              <Input
                type="email"
                name="email"
                value={formData.email || ""}
                readOnly
                disabled
                placeholder="이메일"
                $darkMode={isDarkMode}
                style={{
                  cursor: "not-allowed",
                  opacity: 0.6,
                  backgroundColor: isDarkMode ? "#1a1a1a" : "#f5f5f5",
                }}
              />
            </FormGroup>

            <FormGroup>
              <Label $darkMode={isDarkMode}>전화번호</Label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone || ""}
                readOnly
                disabled
                placeholder="전화번호"
                $darkMode={isDarkMode}
                style={{
                  cursor: "not-allowed",
                  opacity: 0.6,
                  backgroundColor: isDarkMode ? "#1a1a1a" : "#f5f5f5",
                }}
              />
            </FormGroup>

            <DesktopSubmitButton type="submit" disabled={loading}>
              {loading ? "저장 중..." : "제출"}
            </DesktopSubmitButton>
          </Form>
        </MainContent>
      </Container>
    </>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: ${(props) => (props.$darkMode ? "#000" : "#fafafa")};

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
  background: ${(props) => (props.$darkMode ? "#000" : "white")};
  border-bottom: 1px solid
    ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
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
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
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

  &:hover:not(:disabled) {
    color: #00376b;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MainContent = styled.main`
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  background: ${(props) => (props.$darkMode ? "#000" : "white")};
  min-height: 100vh;

  @media (max-width: 767px) {
    background: ${(props) => (props.$darkMode ? "#000" : "#fafafa")};
  }
`;

const Header = styled.div`
  padding: 30px 20px 20px;
  border-bottom: 1px solid
    ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};

  @media (max-width: 767px) {
    display: none;
  }
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
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
  border-bottom: 1px solid
    ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
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

const ProfileImage = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
`;

const ProfileImagePlaceholder = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${(props) => (props.$darkMode ? "#1a1a1a" : "#fafafa")};
  border: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const ChangePhotoButton = styled.button`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#0095f6" : "#0095f6")};
  cursor: pointer;
  outline: none;
  border: none;
  background: transparent;

  &:hover:not(:disabled) {
    color: ${(props) => (props.$darkMode ? "#1877f2" : "#00376b")};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
  border-radius: 6px;
  font-size: 14px;
  color: ${(props) => (props.$darkMode ? "#fff" : "#262626")};
  background: ${(props) => (props.$darkMode ? "#000" : "white")};
  outline: none;

  &::placeholder {
    color: #8e8e8e;
  }

  &:focus {
    border-color: ${(props) => (props.$darkMode ? "#3a3a3a" : "#a8a8a8")};
  }
`;

const Divider = styled.div`
  height: 1px;
  background: ${(props) => (props.$darkMode ? "#262626" : "#dbdbdb")};
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

  &:hover:not(:disabled) {
    background: #1877f2;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 767px) {
    display: none;
  }
`;

export default ProfileEdit;
