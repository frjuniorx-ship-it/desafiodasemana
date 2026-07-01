import { useState } from 'react'
import Background from './components/Background'
import Header from './components/Header'
import Gallery from './components/Gallery'
import Battle from './components/Battle'
import Login from './components/Login'
import Perfil from './components/Perfil'
import { getUsuarioLogado, logout } from './api/auth.js'
import './App.css'

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
        {screen === 'battle' && <Battle npc={selectedNpc} onGameOver={() => setScreen('gallery')} token={user?.token} />}
        {screen === 'perfil' && user && <Perfil user={user} onLogout={handleLogout} onBack={() => setScreen('gallery')} />}
        {showLogin && <Login onLogin={handleLogin} onClose={() => { setShowLogin(false); setPendingNpc(null); }} />}
      </div>
    </>
  )
}
