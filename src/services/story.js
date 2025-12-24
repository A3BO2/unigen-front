const baseURL = import.meta.env.VITE_API_BASE_URL;

export async function createStory(formData) {
  const token = sessionStorage.getItem("token");

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

  if (!res.ok) {
    throw new Error(data?.message || "스토리 업로드 실패");
  }
  return data;
}
