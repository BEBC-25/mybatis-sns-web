interface PostCardProps {
  memberId: number;
  content: string;
  likeCount: number;
}

function PostCard({ memberId, content, likeCount }: PostCardProps) {
  return (
    <article style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '12px', backgroundColor: '#fafafa' }}>
      <div style={{ color: '#888', fontSize: '14px', marginBottom: '8px' }}>
        작성자 회원 번호: {memberId}
      </div>
      <p style={{ fontSize: '16px', lineHeight: '1.5', margin: '0 0 12px 0' }}>
        {content}
      </p>
      <div>
        <button style={{ padding: '6px 12px', cursor: 'pointer' }}>
          ❤️ 좋아요 {likeCount}
        </button>
      </div>
    </article>
  );
}

export default PostCard;