const baseURL = import.meta.env.VITE_API_BASE_URL; // http://localhost:3000/api/v1

async function apifetch(url, options) {
  const res = await fetch(`${baseURL}${url}`, {
    ...options,
    headers: {
      "content-Type": "application/json",
      ...options.headers,
    },
  });
  let data;
  try {
    data = await res.json();
  } catch (error) {
    console.error(error);
  }
  if (res.status > 299 || res.status < 200) {
    const message =
      data && data.message ? data.message : "API 요청 중 에러가 발생했습니다.";
    throw new Error(message);
  }
  return data;
}

function getHeaders() {
  const token = localStorage.getItem("token"); // 로컬 스토리지에서 토큰을 가져옴
  console.log("Authorization Token:", token);
  return {
    Authorization: token ? `Bearer ${token}` : "",
  };
}

// api 예시 https://api.seniorsns.com/api/v1/posts/feed?mode=senior&page=1&size=10
export async function getPosts(mode, page = 1, size = 10) {
  const params = new URLSearchParams();
  if (mode) params.append("mode", mode);
  params.append("page", page);
  params.append("size", size);

  const query = params.toString() ? `?${params.toString()}` : "";
  console.log(query);
  return await apifetch(`/posts/feed${query}`, {
    method: "GET",
    headers: getHeaders(),
  });
}
/* api 응답결과
 {
    "items": [
        {
            "id": 3,
            "author": {
                "id": 1,
                "name": "김영수",
                "profileImageUrl": null
            },
            "content": "팀 프로젝트 화이팅!",
            "imageUrl": "https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=500",
            "postType": null,
            "isSeniorMode": false,
            "likeCount": 0,
            "commentCount": 0,
            "createdAt": "2025-12-16T13:01:46.000Z"
        },
        {
            "id": 1,
            "author": {
                "id": 1,
                "name": "김영수",
                "profileImageUrl": null
            },
            "content": "오늘은 날씨가 좋아서 동네 공원을 산책했어요.",
            "imageUrl": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500",
            "postType": "feed",
            "isSeniorMode": true,
            "likeCount": 0,
            "commentCount": 0,
            "createdAt": "2025-12-16T12:39:27.000Z"
        },
    ],
    "page": 1,
    "size": 10,
    "hasNext": false
}
*/
