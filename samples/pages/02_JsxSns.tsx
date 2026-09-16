function JsxSns() {
  const post = {
    id: 1,
    memberId: 10,
    content: 'MyBatis SNS 첫 번째 게시글입니다. React 학습 중!',
    likeCount: 5,
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '2px solid #222', paddingBottom: '10px', marginBottom: '20px' }}>
        <h2>02 단일 JSX - MyBatis SNS</h2>
      </header>

      <article style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', backgroundColor: '#fafafa' }}>
        <div style={{ color: '#888', fontSize: '14px', marginBottom: '8px' }}>
          작성자 회원 번호: {post.memberId}
        </div>
        <p style={{ fontSize: '16px', lineHeight: '1.5', margin: '0 0 12px 0' }}>
          {post.content}
        </p>
        <div>
          <button style={{ padding: '6px 12px', cursor: 'pointer' }}>
            ❤️ 좋아요 {post.likeCount}
          </button>
        </div>
      </article>
    </div>
  );
}

export default JsxSns;