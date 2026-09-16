import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h2>01 Counter - React 시작하기</h2>
      <hr />
      <p>현재 카운트: {count}</p>
      <button onClick={() => setCount(count - 1)}>
        1 감소
      </button>
      <button onClick={() => setCount(0)} style={{ marginLeft: '8px' }}>
        초기화
      </button>
      <button onClick={() => setCount(count + 1)} style={{ marginLeft: '8px' }}>
        1 증가
      </button>
    </div>
  );
}

export default Counter;