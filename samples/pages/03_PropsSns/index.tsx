import PostCard from './PostCard';

function PropsSns() {
  const posts = [
    { id: 1, memberId: 10, content: 'MyBatis SNS 첫 번째 게시글입니다. React 학습 중!', likeCount: 5 },
    { id: 2, memberId: 20, content: '스프링 부트와 리액트 연동을 위한 준비 완료!', likeCount: 12 },
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '2px solid #222', paddingBottom: '10px', marginBottom: '20px' }}>
        <h2>03 Props 분리 - MyBatis SNS</h2>
      </header>

      {posts.map((post) => (
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

export default PropsSns;