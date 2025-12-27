const baseURL = import.meta.env.VITE_API_BASE_URL;

export async function createStory(formData) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${baseURL}/stories`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: formData,
  });

  // 응답 처리
  let data;
  try {
    data = await res.json();
  } catch (error) {
    console.log(error);
  }

  // 401 에러 (인증 실패) 처리
  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("appMode");
    
    const currentPath = window.location.pathname;
    if (currentPath.includes("/senior")) {
      window.location.href = "/senior/login";
    } else {
      window.location.href = "/normal/login";
    }
    
    const message = data?.message || "유효하지 않거나 만료된 토큰입니다.";
    throw new Error(message);
  }

  if (!res.ok) {
    throw new Error(data?.message || "스토리 업로드 실패");
  }
  return data;
}
