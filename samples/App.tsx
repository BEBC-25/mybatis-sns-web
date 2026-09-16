import { BrowserRouter, Routes, Route, NavLink } from 'react-router';
import Counter from './pages/01_Counter';
import JsxSns from './pages/02_JsxSns';
import PropsSns from './pages/03_PropsSns';
import StateSns from './pages/04_StateSns';
import ApiSns from './pages/05_ApiSns';


function Home() {
  return (
    <div style={{ padding: '30px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>React 학습 종합 네비게이션 허브</h2>
      <p style={{ color: '#666', lineHeight: '1.6' }}>
        React 기초부터 실제 백엔드 연동까지 단계별 예제를 확인할 수 있습니다.
        상단 메뉴를 클릭하여 각 실습 화면으로 이동하십시오.
      </p>
      <ul style={{ lineHeight: '2', marginTop: '20px' }}>
        <li><NavLink to="/counter">01. 카운터 (React 시작 및 HMR)</NavLink></li>
        <li><NavLink to="/jsx">02. 단일 JSX (MyBatis SNS)</NavLink></li>
        <li><NavLink to="/props">03. Props 분리 (MyBatis SNS)</NavLink></li>
        <li><NavLink to="/state">04. State 인터랙션 (MyBatis SNS)</NavLink></li>
        <li><NavLink to="/api-sns">05. API 연동 (MyBatis SNS)</NavLink></li>

      </ul>
    </div>
  );
}

function App() {
  const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: '8px 16px',
    marginRight: '8px',
    borderRadius: '4px',
    textDecoration: 'none',
    fontWeight: isActive ? ('bold' as const) : ('normal' as const),
    backgroundColor: isActive ? '#333' : '#f0f0f0',
    color: isActive ? '#fff' : '#333',
  });

  return (
    <BrowserRouter>
      <div style={{ fontFamily: 'sans-serif' }}>
        <nav style={{ padding: '16px 24px', borderBottom: '1px solid #ddd', backgroundColor: '#fafafa', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <NavLink to="/" style={navLinkStyle}>홈</NavLink>
          <NavLink to="/counter" style={navLinkStyle}>01. 카운터</NavLink>
          <NavLink to="/jsx" style={navLinkStyle}>02. 단일 JSX</NavLink>
          <NavLink to="/props" style={navLinkStyle}>03. Props 분리</NavLink>
          <NavLink to="/state" style={navLinkStyle}>04. State 인터랙션</NavLink>
          <NavLink to="/api-sns" style={navLinkStyle}>05. API 연동</NavLink>


        </nav>

        <main style={{ padding: '20px' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/counter" element={<Counter />} />
            <Route path="/jsx" element={<JsxSns />} />
            <Route path="/props" element={<PropsSns />} />
            <Route path="/state" element={<StateSns />} />
            <Route path="/api-sns" element={<ApiSns />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;