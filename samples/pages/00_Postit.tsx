import { useState, useEffect, useRef, useCallback, type MouseEvent } from 'react'
import { Peer, type DataConnection } from 'peerjs'
import './00_Postit.css'

// 포스트잇 색상 타입
export type NoteColor = 'yellow' | 'pink' | 'mint' | 'green' | 'purple' | 'orange'

// 포스트잇 데이터 인터페이스
export interface Note {
  id: string
  content: string
  color: NoteColor
  x: number
  y: number
  zIndex: number
  pinned: boolean
  rotation: number
  createdAt: number
  updatedAt: number
}

// 실시간 동기화 메시지 타입 정의
type SyncMessage =
  | { type: 'CLIENT_JOIN'; senderId: string }
  | { type: 'CLIENT_HEARTBEAT'; senderId: string }
  | { type: 'CLIENT_LEAVE'; senderId: string }
  | { type: 'REQUEST_SYNC'; senderId: string }
  | { type: 'SYNC_FULL'; notes: Note[]; senderId: string }
  | { type: 'NOTE_CREATE'; note: Note; senderId: string }
  | { type: 'NOTE_UPDATE_CONTENT'; id: string; content: string; senderId: string }
  | { type: 'NOTE_MOVE'; id: string; x: number; y: number; senderId: string }
  | { type: 'NOTE_CHANGE_COLOR'; id: string; color: NoteColor; senderId: string }
  | { type: 'NOTE_TOGGLE_PIN'; id: string; senderId: string }
  | { type: 'NOTE_DELETE'; id: string; senderId: string }
  | { type: 'NOTES_ARRANGE'; notes: Note[]; senderId: string }
  | { type: 'NOTES_RESET'; notes: Note[]; senderId: string }

// 고정된 글로벌 공용 방 ID (모든 브라우저가 자동 접속)
const GLOBAL_HOST_ID = 'sticky-board-public-shared-room-v1'
const BROADCAST_CHANNEL_NAME = 'global_sticky_board_channel'

// 색상 목록 및 메타데이터
const NOTE_COLORS: { key: NoteColor; label: string; bg: string }[] = [
  { key: 'yellow', label: '노랑', bg: '#fff875' },
  { key: 'pink', label: '분홍', bg: '#ffb8d9' },
  { key: 'mint', label: '민트', bg: '#a4f2ec' },
  { key: 'green', label: '연두', bg: '#c9f59f' },
  { key: 'purple', label: '보라', bg: '#e2c9ff' },
  { key: 'orange', label: '주황', bg: '#ffd49b' },
]

// 로컬스토리지 키
const STORAGE_KEY = 'sticky_notes_workspace_data'

// 기본 샘플 메모 데이터
const INITIAL_NOTES: Note[] = [
  {
    id: 'note-1',
    content: 'WebRTC P2P 실시간 연동 🌐\n\n크롬, 엣지, 시크릿 모드, 스마트폰 등\n서로 다른 브라우저에서도\n서버 없이 실시간으로 동기화됩니다!',
    color: 'yellow',
    x: 80,
    y: 60,
    zIndex: 1,
    pinned: false,
    rotation: -1.5,
    createdAt: Date.now() - 3600000 * 3,
    updatedAt: Date.now() - 3600000 * 3,
  },
  {
    id: 'note-2',
    content: '실시간 동시 수정 💡\n\n다른 브라우저 창에서\n메모를 끌어서 옮기거나\n글을 쓰면 즉시 반영됩니다!',
    color: 'mint',
    x: 370,
    y: 90,
    zIndex: 2,
    pinned: false,
    rotation: 1.2,
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'note-3',
    content: 'P2P DataChannel ✨\n\n- 완전한 WebRTC 직접 통신\n- 방 생성 없이 공용 보드 자동 접속\n- 로컬스토리지 기반 아닌 실제 네트워크 패킷 전송\n- 접속자 수 실시간 표시',
    color: 'pink',
    x: 660,
    y: 70,
    zIndex: 3,
    pinned: true,
    rotation: -0.8,
    createdAt: Date.now() - 3600000 * 1,
    updatedAt: Date.now() - 3600000 * 1,
  },
]

// 임의의 회전 각도 생성 (-2.5도 ~ 2.5도)
function getRandomRotation(): number {
  return Number(((Math.random() - 0.5) * 5).toFixed(1))
}

// 작성 시간 포맷 함수
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

export function App() {
  // 클라이언트 고유 식별자
  const clientId = useRef(
    'peer_' + Math.random().toString(36).substring(2, 9),
  ).current

  // 상태 관리: 로컬 스토리지에서 불러오기
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch {
      // 로컬 스토리지 파싱 실패 시 기본값 사용
    }
    return INITIAL_NOTES
  })

  // 최신 notes 상태를 참조하기 위한 Ref
  const notesRef = useRef<Note[]>(notes)
  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  // 실시간 접속자 수 상태 및 호스트 여부
  const [peerCount, setPeerCount] = useState<number>(1)
  const [webrtcStatus, setWebrtcStatus] = useState<'connecting' | 'connected' | 'host'>('connecting')

  // 검색 키워드 상태
  const [searchKeyword, setSearchKeyword] = useState('')
  // 색상 필터 상태
  const [selectedColor, setSelectedColor] = useState<NoteColor | 'all'>('all')
  // 색상 변경 팝오버가 열린 메모의 ID
  const [activePickerId, setActivePickerId] = useState<string | null>(null)

  // 스탑워치 상태
  const [stopwatchTime, setStopwatchTime] = useState(0)
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false)
  const [isStopwatchOpen, setIsStopwatchOpen] = useState(true)

  // 스탑워치 타이머 인터벌 동작 (10ms 단위)
  useEffect(() => {
    let intervalId: number | null = null
    if (isStopwatchRunning) {
      intervalId = window.setInterval(() => {
        setStopwatchTime((prev) => prev + 10)
      }, 10)
    }
    return () => {
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [isStopwatchRunning])

  // 스탑워치 시간 포맷팅 함수 (MM:SS.ss)
  const formatStopwatch = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    const centiseconds = Math.floor((ms % 1000) / 10)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
  }

  // 스탑워치 리셋 핸들러
  const handleStopwatchReset = () => {
    setIsStopwatchRunning(false)
    setStopwatchTime(0)
  }

  // 드래그 관련 참조값
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragInfoRef = useRef<{
    noteId: string
    startX: number
    startY: number
    initialNoteX: number
    initialNoteY: number
  } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  // WebRTC DataConnection 관리용 Ref
  const peerInstanceRef = useRef<Peer | null>(null)
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map())
  const isHostRef = useRef<boolean>(false)
  const channelRef = useRef<BroadcastChannel | null>(null)

  // 수신된 동기화 메시지 처리 함수
  const handleIncomingMessage = useCallback((msg: SyncMessage, fromPeerId?: string) => {
    if (!msg || msg.senderId === clientId) return

    switch (msg.type) {
      case 'CLIENT_JOIN':
        // 새 클라이언트가 참가했으므로 최신 전체 메모 전송
        if (isHostRef.current) {
          const syncMsg: SyncMessage = {
            type: 'SYNC_FULL',
            notes: notesRef.current,
            senderId: clientId,
          }
          if (fromPeerId && connectionsRef.current.has(fromPeerId)) {
            connectionsRef.current.get(fromPeerId)?.send(syncMsg)
          }
        }
        break

      case 'REQUEST_SYNC':
        if (isHostRef.current) {
          const syncMsg: SyncMessage = {
            type: 'SYNC_FULL',
            notes: notesRef.current,
            senderId: clientId,
          }
          if (fromPeerId && connectionsRef.current.has(fromPeerId)) {
            connectionsRef.current.get(fromPeerId)?.send(syncMsg)
          }
        }
        break

      case 'SYNC_FULL':
        if (Array.isArray(msg.notes) && msg.notes.length > 0) {
          setNotes(msg.notes)
        }
        break

      case 'NOTE_CREATE':
        setNotes((prev) => {
          if (prev.some((n) => n.id === msg.note.id)) return prev
          return [...prev, msg.note]
        })
        break

      case 'NOTE_UPDATE_CONTENT':
        setNotes((prev) =>
          prev.map((n) =>
            n.id === msg.id
              ? { ...n, content: msg.content, updatedAt: Date.now() }
              : n,
          ),
        )
        break

      case 'NOTE_MOVE':
        setNotes((prev) =>
          prev.map((n) =>
            n.id === msg.id ? { ...n, x: msg.x, y: msg.y } : n,
          ),
        )
        break

      case 'NOTE_CHANGE_COLOR':
        setNotes((prev) =>
          prev.map((n) =>
            n.id === msg.id
              ? { ...n, color: msg.color, updatedAt: Date.now() }
              : n,
          ),
        )
        break

      case 'NOTE_TOGGLE_PIN':
        setNotes((prev) =>
          prev.map((n) =>
            n.id === msg.id ? { ...n, pinned: !n.pinned } : n,
          ),
        )
        break

      case 'NOTE_DELETE':
        setNotes((prev) => prev.filter((n) => n.id !== msg.id))
        break

      case 'NOTES_ARRANGE':
      case 'NOTES_RESET':
        setNotes(msg.notes)
        break

      default:
        break
    }

    // 호스트인 경우, 받은 메시지를 다른 연결된 피어들에게 릴레이(브로드캐스트)
    if (isHostRef.current && fromPeerId) {
      connectionsRef.current.forEach((conn, id) => {
        if (id !== fromPeerId && conn.open) {
          conn.send(msg)
        }
      })
    }
  }, [clientId])

  // 전체 피어 및 로컬 채널로 메시지 전송
  const broadcast = useCallback(
    (message: SyncMessage) => {
      // 1. 같은 브라우저 탭 간 BroadcastChannel 전송
      try {
        channelRef.current?.postMessage(message)
      } catch {
        // 무시
      }

      // 2. 다른 브라우저/기기 간 WebRTC DataChannel 직접 패킷 전송
      connectionsRef.current.forEach((conn) => {
        if (conn.open) {
          try {
            conn.send(message)
          } catch {
            // 전송 실패 처리
          }
        }
      })
    },
    [],
  )

  // WebRTC P2P 자동 연결 로직 (호스트 선출 및 클라이언트 연결)
  useEffect(() => {
    // 로컬 탭 동기화 채널
    const localChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
    channelRef.current = localChannel
    localChannel.onmessage = (event: MessageEvent<SyncMessage>) => {
      handleIncomingMessage(event.data)
    }

    let isDestroyed = false

    const setupConnection = (conn: DataConnection) => {
      conn.on('open', () => {
        connectionsRef.current.set(conn.peer, conn)
        setPeerCount(connectionsRef.current.size + 1)

        // 참가 알림 및 동기화 요청
        conn.send({ type: 'CLIENT_JOIN', senderId: clientId })
        conn.send({ type: 'REQUEST_SYNC', senderId: clientId })
      })

      conn.on('data', (data) => {
        handleIncomingMessage(data as SyncMessage, conn.peer)
      })

      conn.on('close', () => {
        connectionsRef.current.delete(conn.peer)
        setPeerCount(connectionsRef.current.size + 1)
      })

      conn.on('error', () => {
        connectionsRef.current.delete(conn.peer)
        setPeerCount(connectionsRef.current.size + 1)
      })
    }

    // 1단계: 고정된 호스트 ID로 생성 시도
    const hostPeer = new Peer(GLOBAL_HOST_ID)
    peerInstanceRef.current = hostPeer

    hostPeer.on('open', () => {
      if (isDestroyed) return
      isHostRef.current = true
      setWebrtcStatus('host')

      // 호스트로서 다른 피어의 연결 수신
      hostPeer.on('connection', (conn) => {
        conn.on('open', () => {
          connectionsRef.current.set(conn.peer, conn)
          setPeerCount(connectionsRef.current.size + 1)

          // 새 피어에게 현재 메모 목록 즉시 전달
          conn.send({
            type: 'SYNC_FULL',
            notes: notesRef.current,
            senderId: clientId,
          })
        })

        conn.on('data', (data) => {
          handleIncomingMessage(data as SyncMessage, conn.peer)
        })

        conn.on('close', () => {
          connectionsRef.current.delete(conn.peer)
          setPeerCount(connectionsRef.current.size + 1)
        })
      })
    })

    // 2단계: 호스트 ID가 이미 사용 중인 경우(다른 브라우저가 먼저 켜져 있음)
    hostPeer.on('error', (err) => {
      if (isDestroyed) return
      if (err.type === 'unavailable-id') {
        // 호스트가 이미 존재하므로, 게스트 피어로 새로 생성
        hostPeer.destroy()

        const guestPeer = new Peer(clientId)
        peerInstanceRef.current = guestPeer

        guestPeer.on('open', () => {
          if (isDestroyed) return
          isHostRef.current = false
          setWebrtcStatus('connected')

          // 기존 호스트에 WebRTC DataConnection 연결
          const conn = guestPeer.connect(GLOBAL_HOST_ID, { reliable: true })
          setupConnection(conn)
        })

        guestPeer.on('error', () => {
          // 재연결 시도
        })
      }
    })

    return () => {
      isDestroyed = true
      localChannel.close()
      connectionsRef.current.forEach((conn) => conn.close())
      connectionsRef.current.clear()
      peerInstanceRef.current?.destroy()
    }
  }, [clientId, handleIncomingMessage])

  // 메모 변경 시 로컬 스토리지에 동기화
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
    } catch {
      // 스토리지 용량 초과 예외 처리
    }
  }, [notes])

  // 현재 가장 높은 z-index 계산
  const getNextZIndex = useCallback(() => {
    return notes.reduce((max, note) => Math.max(max, note.zIndex), 0) + 1
  }, [notes])

  // 최상단으로 포스트잇 가져오기
  const bringToFront = useCallback(
    (id: string) => {
      const nextZ = getNextZIndex()
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.id === id ? { ...note, zIndex: nextZ } : note,
        ),
      )
    },
    [getNextZIndex],
  )

  // 새 메모 생성 함수
  const createNote = useCallback(
    (x?: number, y?: number, preferredColor?: NoteColor) => {
      const canvas = canvasRef.current
      const canvasWidth = canvas?.clientWidth || window.innerWidth
      const canvasHeight = canvas?.clientHeight || window.innerHeight

      const defaultX =
        x !== undefined
          ? Math.max(20, Math.min(x, canvasWidth - 270))
          : Math.floor(Math.random() * (canvasWidth - 320)) + 60
      const defaultY =
        y !== undefined
          ? Math.max(20, Math.min(y, canvasHeight - 270))
          : Math.floor(Math.random() * (canvasHeight - 320)) + 40

      const color =
        preferredColor ||
        NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)].key

      const newNote: Note = {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        content: '',
        color,
        x: defaultX,
        y: defaultY,
        zIndex: getNextZIndex(),
        pinned: false,
        rotation: getRandomRotation(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      setNotes((prev) => [...prev, newNote])
      // 모든 접속자(다른 브라우저 포함)에게 WebRTC P2P 실시간 전송
      broadcast({ type: 'NOTE_CREATE', note: newNote, senderId: clientId })
    },
    [getNextZIndex, broadcast, clientId],
  )

  // 메모 내용 수정
  const updateContent = (id: string, content: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, content, updatedAt: Date.now() } : note,
      ),
    )
    // 모든 접속자(다른 브라우저 포함)에게 실시간 내용 전송
    broadcast({ type: 'NOTE_UPDATE_CONTENT', id, content, senderId: clientId })
  }

  // 메모 색상 변경
  const changeColor = (id: string, color: NoteColor) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, color, updatedAt: Date.now() } : note,
      ),
    )
    setActivePickerId(null)
    // 모든 접속자(다른 브라우저 포함)에게 실시간 색상 변경 전송
    broadcast({ type: 'NOTE_CHANGE_COLOR', id, color, senderId: clientId })
  }

  // 메모 고정(핀) 토글
  const togglePin = (id: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, pinned: !note.pinned } : note,
      ),
    )
    // 모든 접속자(다른 브라우저 포함)에게 실시간 핀 상태 전송
    broadcast({ type: 'NOTE_TOGGLE_PIN', id, senderId: clientId })
  }

  // 메모 삭제
  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id))
    if (activePickerId === id) {
      setActivePickerId(null)
    }
    // 모든 접속자(다른 브라우저 포함)에게 실시간 삭제 전송
    broadcast({ type: 'NOTE_DELETE', id, senderId: clientId })
  }

  // 격자로 자동 정렬하기
  const arrangeNotes = () => {
    const canvas = canvasRef.current
    const canvasWidth = canvas?.clientWidth || window.innerWidth
    const noteWidth = 270
    const noteHeight = 250
    const paddingX = 30
    const paddingY = 30
    const cols = Math.max(1, Math.floor((canvasWidth - 60) / (noteWidth + paddingX)))

    const arranged = notesRef.current.map((note, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      return {
        ...note,
        x: 40 + col * (noteWidth + paddingX),
        y: 40 + row * (noteHeight + paddingY),
        rotation: getRandomRotation(),
      }
    })

    setNotes(arranged)
    // 모든 접속자(다른 브라우저 포함)에게 정렬 전파
    broadcast({ type: 'NOTES_ARRANGE', notes: arranged, senderId: clientId })
  }

  // 샘플 메모로 복원
  const resetToSample = () => {
    setNotes(INITIAL_NOTES)
    setSelectedColor('all')
    setSearchKeyword('')
    // 모든 접속자(다른 브라우저 포함)에게 복원 전파
    broadcast({ type: 'NOTES_RESET', notes: INITIAL_NOTES, senderId: clientId })
  }

  // 드래그 시작 핸들러
  const handleMouseDown = (e: MouseEvent<HTMLElement>, note: Note) => {
    if (note.pinned) return

    const target = e.target as HTMLElement
    if (
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.classList.contains('color-option')
    ) {
      bringToFront(note.id)
      return
    }

    bringToFront(note.id)
    setDraggingId(note.id)

    dragInfoRef.current = {
      noteId: note.id,
      startX: e.clientX,
      startY: e.clientY,
      initialNoteX: note.x,
      initialNoteY: note.y,
    }

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      if (!dragInfoRef.current) return

      const deltaX = moveEvent.clientX - dragInfoRef.current.startX
      const deltaY = moveEvent.clientY - dragInfoRef.current.startY

      const canvas = canvasRef.current
      const maxWidth = (canvas?.clientWidth || window.innerWidth) - 260
      const maxHeight = (canvas?.clientHeight || window.innerHeight) - 240

      const nextX = Math.max(10, Math.min(dragInfoRef.current.initialNoteX + deltaX, maxWidth))
      const nextY = Math.max(10, Math.min(dragInfoRef.current.initialNoteY + deltaY, maxHeight))

      setNotes((prevNotes) =>
        prevNotes.map((item) =>
          item.id === dragInfoRef.current?.noteId
            ? { ...item, x: nextX, y: nextY }
            : item,
        ),
      )

      // 다른 브라우저 및 다른 컴퓨터로도 마우스 드래그 좌표 실시간 전송
      broadcast({
        type: 'NOTE_MOVE',
        id: dragInfoRef.current.noteId,
        x: nextX,
        y: nextY,
        senderId: clientId,
      })
    }

    const handleMouseUp = () => {
      dragInfoRef.current = null
      setDraggingId(null)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // 캔버스 더블 클릭 시 새 포스트잇 생성
  const handleCanvasDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target === canvasRef.current || target.classList.contains('board-instruction')) {
      const rect = canvasRef.current?.getBoundingClientRect()
      const x = e.clientX - (rect?.left || 0) - 125
      const y = e.clientY - (rect?.top || 0) - 40
      createNote(x, y)
    }
  }

  // 필터링 및 검색된 메모 목록
  const filteredNotes = notes.filter((note) => {
    const matchesColor = selectedColor === 'all' || note.color === selectedColor
    const matchesSearch =
      searchKeyword.trim() === '' ||
      note.content.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesColor && matchesSearch
  })

  return (
    <div className="app-container">
      {/* 상단 툴바 및 컨트롤 */}
      <header className="top-nav">
        <div className="nav-brand">
          <div className="brand-icon" aria-hidden="true">
            📝
          </div>
          <div>
            <h1 className="brand-title">포스트잇 메모보드</h1>
          </div>
          <span className="brand-badge">{notes.length}개 메모</span>

          {/* WebRTC P2P 실시간 상태 배지 */}
          <div
            className="sync-status-badge"
            title="WebRTC P2P로 다른 브라우저 및 기기와 직접 패킷을 주고받습니다"
          >
            <span className="sync-dot" />
            <span>
              {webrtcStatus === 'host'
                ? 'WebRTC P2P (메인 호스트)'
                : 'WebRTC P2P 연결됨'}
            </span>
            <span className="sync-peer-count">접속 {peerCount}명</span>
          </div>
        </div>

        <div className="nav-controls">
          {/* 메모 검색 */}
          <div className="search-box">
            <span aria-hidden="true">🔍</span>
            <input
              type="text"
              placeholder="메모 검색..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              aria-label="메모 내용 검색"
            />
          </div>

          {/* 색상 필터 칩 */}
          <div className="color-filters" aria-label="색상별 필터">
            <button
              type="button"
              className={`color-chip all ${selectedColor === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedColor('all')}
              title="전체 색상 보기"
              aria-label="전체 색상 보기"
            />
            {NOTE_COLORS.map((col) => (
              <button
                key={col.key}
                type="button"
                className={`color-chip ${selectedColor === col.key ? 'active' : ''}`}
                style={{ backgroundColor: col.bg }}
                onClick={() => setSelectedColor(col.key)}
                title={`${col.label} 색상만 보기`}
                aria-label={`${col.label} 색상만 보기`}
              />
            ))}
          </div>

          {/* 주요 액션 버튼 */}
          <div className="btn-group">
            <button
              type="button"
              className="action-btn secondary"
              onClick={arrangeNotes}
              title="포스트잇을 격자로 깔끔하게 정리합니다"
            >
              <span aria-hidden="true">📐</span> 정렬하기
            </button>
            <button
              type="button"
              className="action-btn secondary"
              onClick={resetToSample}
              title="예제 샘플 메모로 되돌리기"
            >
              <span aria-hidden="true">🔄</span> 샘플 복원
            </button>
            <button
              type="button"
              className="action-btn primary"
              onClick={() => createNote()}
            >
              <span aria-hidden="true">➕</span> 새 메모
            </button>
          </div>
        </div>
      </header>

      {/* 포스트잇 보드 캔버스 */}
      <main
        ref={canvasRef}
        className="board-canvas"
        onDoubleClick={handleCanvasDoubleClick}
      >
        {/* 우측 상단 스탑워치 위젯 */}
        <aside
          className={`stopwatch-widget ${isStopwatchOpen ? '' : 'collapsed'}`}
          aria-label="스탑워치"
        >
          <div className="stopwatch-header">
            <div className="stopwatch-title">
              <span aria-hidden="true">⏱️</span>
              <span>스탑워치</span>
            </div>
            <button
              type="button"
              className="stopwatch-toggle-btn"
              onClick={() => setIsStopwatchOpen(!isStopwatchOpen)}
              title={isStopwatchOpen ? '접기' : '펼치기'}
              aria-label={isStopwatchOpen ? '스탑워치 접기' : '스탑워치 펼치기'}
            >
              {isStopwatchOpen ? '▲' : '▼'}
            </button>
          </div>

          {isStopwatchOpen && (
            <>
              <div
                className={`stopwatch-display ${isStopwatchRunning ? 'active' : ''}`}
              >
                {formatStopwatch(stopwatchTime)}
              </div>
              <div className="stopwatch-controls">
                <button
                  type="button"
                  className={`stopwatch-btn ${isStopwatchRunning ? 'pause' : 'start'}`}
                  onClick={() => setIsStopwatchRunning(!isStopwatchRunning)}
                  aria-label={isStopwatchRunning ? '일시정지' : '시작'}
                >
                  {isStopwatchRunning ? '일시정지' : '시작'}
                </button>
                <button
                  type="button"
                  className="stopwatch-btn reset"
                  onClick={handleStopwatchReset}
                  aria-label="초기화"
                >
                  초기화
                </button>
              </div>
            </>
          )}
        </aside>

        {/* 하단 힌트 안내문 */}
        <div className="board-instruction">
          💡 WebRTC P2P로 다른 브라우저와 자동 연결됩니다. 빈 공간을 더블클릭하여 메모를 붙여보세요!
        </div>

        {/* 메모가 없을 때 안내 */}
        {notes.length === 0 && (
          <div className="empty-board-guide">
            <div className="empty-board-icon">📌</div>
            <h2 className="empty-board-title">보드가 비어 있습니다</h2>
            <p className="empty-board-desc">
              상단 버튼을 눌러 첫 번째 포스트잇을 붙여보세요!
            </p>
            <button
              type="button"
              className="action-btn primary"
              onClick={() => createNote()}
            >
              새 메모 작성하기
            </button>
          </div>
        )}

        {/* 개별 포스트잇 렌더링 */}
        {filteredNotes.map((note) => {
          const isDragging = draggingId === note.id
          const isPickerOpen = activePickerId === note.id

          return (
            <article
              key={note.id}
              className={`post-it ${note.color} ${note.pinned ? 'is-pinned' : ''} ${isDragging ? 'is-dragging' : ''}`}
              style={{
                left: `${note.x}px`,
                top: `${note.y}px`,
                zIndex: note.zIndex,
                transform: isDragging ? 'none' : `rotate(${note.rotation}deg)`,
              }}
              onMouseDown={(e) => handleMouseDown(e, note)}
            >
              {/* 상단 장식 테이프 및 핀 */}
              <div className="tape-decoration" aria-hidden="true" />
              <div className="pin-decoration" aria-hidden="true" />

              {/* 포스트잇 헤더 (드래그 핸들) */}
              <div className="note-header">
                <span className="note-time">{formatTime(note.createdAt)}</span>
                <div className="note-actions">
                  {/* 색상 선택 팝오버 */}
                  {isPickerOpen && (
                    <div className="color-picker-popover">
                      {NOTE_COLORS.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          className="color-option"
                          style={{ backgroundColor: c.bg }}
                          onClick={() => changeColor(note.id, c.key)}
                          title={c.label}
                          aria-label={`${c.label} 색상으로 변경`}
                        />
                      ))}
                    </div>
                  )}

                  {/* 색상 변경 버튼 */}
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() =>
                      setActivePickerId(isPickerOpen ? null : note.id)
                    }
                    title="색상 변경"
                    aria-label="포스트잇 색상 변경"
                  >
                    🎨
                  </button>

                  {/* 핀 고정 버튼 */}
                  <button
                    type="button"
                    className={`icon-btn pin-btn ${note.pinned ? 'active' : ''}`}
                    onClick={() => togglePin(note.id)}
                    title={note.pinned ? '고정 해제' : '보드에 고정'}
                    aria-label={note.pinned ? '고정 해제' : '보드에 고정'}
                  >
                    📌
                  </button>

                  {/* 삭제 버튼 */}
                  <button
                    type="button"
                    className="icon-btn delete-btn"
                    onClick={() => deleteNote(note.id)}
                    title="메모 삭제"
                    aria-label="포스트잇 삭제"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 메모 내용 텍스트 입력창 */}
              <div className="note-body">
                <textarea
                  className="note-textarea"
                  value={note.content}
                  onChange={(e) => updateContent(note.id, e.target.value)}
                  placeholder="메모를 입력하세요..."
                  aria-label="메모 내용 입력"
                />
              </div>

              {/* 포스트잇 하단 글자 수 정보 */}
              <div className="note-footer">
                <span>{note.content.length}자</span>
              </div>
            </article>
          )
        })}
      </main>
    </div>
  )
}

export default App
