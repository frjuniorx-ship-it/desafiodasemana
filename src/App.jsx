import { useState, Component } from 'react'
import Background from './components/Background'
import Header from './components/Header'
import Gallery from './components/Gallery'
import Battle from './components/Battle'
import Login from './components/Login'
import Perfil from './components/Perfil'
import { getUsuarioLogado, logout } from './api/auth.js'
import './App.css'

class BattleErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: 16, fontFamily: 'Lora, serif', color: '#e8d5a8' }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: '#c84d2a' }}>Erro no combate</div>
          <div style={{ fontSize: 13, color: '#a89870', maxWidth: 420, textAlign: 'center' }}>{this.state.error?.message || 'Erro inesperado.'}</div>
          <button onClick={() => this.setState({ error: null })} style={{ padding: '8px 20px', borderRadius: 6, background: 'rgba(200,77,42,.2)', border: '1px solid #c84d2a', color: '#e8d5a8', cursor: 'pointer', fontFamily: "'Cinzel', serif", fontSize: 11 }}>
            Reiniciar batalha
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [screen, setScreen] = useState('gallery')
  const [selectedNpc, setSelectedNpc] = useState(null)
  const [user, setUser] = useState(() => getUsuarioLogado())
  const [showLogin, setShowLogin] = useState(false)
  const [pendingNpc, setPendingNpc] = useState(null)

  function handlePlay(npc) {
    if (!user) {
      setPendingNpc(npc)
      setShowLogin(true)
      return;
    }
    setSelectedNpc(npc)
    setScreen('battle')
  }

  function handleLogin(userData) {
    setUser(userData)
    setShowLogin(false)
    if (pendingNpc) {
      setSelectedNpc(pendingNpc)
      setPendingNpc(null)
      setScreen('battle')
    }
  }

  function handleLogout() {
    logout();
    setUser(null);
    setScreen('gallery');
  }

  const breadcrumb = screen === 'battle' && selectedNpc
    ? `Desafio da Semana › ${selectedNpc.name} · turno 01`
    : screen === 'perfil'
    ? 'Meu Perfil'
    : 'Modo Aventura › Desafios › Semanal'

  return (
    <>
      <Background />
      <div style={{ position: 'relative', zIndex: 3, minHeight: '100vh' }}>
        <Header
          isBattle={screen === 'battle'}
          onBack={() => setScreen('gallery')}
          breadcrumb={breadcrumb}
          user={user}
          onLoginClick={() => setShowLogin(true)}
          onPerfilClick={() => setScreen('perfil')}
        />
        {screen === 'gallery' && <Gallery onPlay={handlePlay} />}
        {screen === 'battle' && <BattleErrorBoundary><Battle npc={selectedNpc} onGameOver={() => setScreen('gallery')} token={user?.token} /></BattleErrorBoundary>}
        {screen === 'perfil' && user && <Perfil user={user} onLogout={handleLogout} onBack={() => setScreen('gallery')} />}
        {showLogin && <Login onLogin={handleLogin} onClose={() => { setShowLogin(false); setPendingNpc(null); }} />}
      </div>
    </>
  )
}
