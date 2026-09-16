import { useState, useEffect } from 'react';
import PostCard from './PostCard';

interface Post {
  id: number;
  memberId: number;
  content: string;
  likeCount: number;
}

function ApiSns() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 마운트 시 1회 실행되는 비동기 데이터 fetch
    fetch('/api/v1/posts')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP 통신 에러: ${response.status}`);
        }
        return response.json();
      })
      .then((data: Post[]) => {
        setPosts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '2px solid #222', paddingBottom: '10px', marginBottom: '20px' }}>
        <h2>04 State 인터랙션 - MyBatis SNS</h2>
      </header>

      {loading && <p>게시글 목록을 불러오는 중...</p>}
      {error && <p style={{ color: 'red' }}>에러 발생: {error}</p>}

      {!loading && !error && posts.length === 0 && (
        <p>등록된 게시글이 없습니다. (백엔드 서버 구동 여부 확인 필요)</p>
      )}

      {!loading && !error && posts.map((post) => (
        <PostCard
          key={post.id}
          memberId={post.memberId}
          content={post.content}
          likeCount={post.likeCount}
        />
      ))}
    </div>
  );
}

export default ApiSns;