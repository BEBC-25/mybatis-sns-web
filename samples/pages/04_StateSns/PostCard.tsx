import { useState } from "react";

interface PostCardProps {
  memberId: number;
  content: string;
  likeCount: number;
}

function PostCard({ memberId, content, likeCount }: PostCardProps) {
  // 부모로부터 전달받은 likeCount를 초기 상태로 관리
  const [likes, setLikes] = useState<number>(likeCount);
  
  return (
    <article style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '12px', backgroundColor: '#fafafa' }}>
      <div style={{ color: '#888', fontSize: '14px', marginBottom: '8px' }}>
        작성자 회원 번호: {memberId}
      </div>
      <p style={{ fontSize: '16px', lineHeight: '1.5', margin: '0 0 12px 0' }}>
        {content}
      </p>
      <div>
        <button onClick={() => setLikes(likes + 1)} style={{ padding: '6px 12px', cursor: 'pointer' }}>
          ❤️ 좋아요 {likes}
        </button>
      </div>
    </article>
  );
}

export default PostCard;