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

  function handlePlay(npc) {
    if (!user) {
      setScreen('login');
      return;
    }
    setSelectedNpc(npc)
    setScreen('battle')
  }

  function handleLogin(userData) {
    setUser(userData);
    setScreen('gallery');
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
          onLoginClick={() => setScreen('login')}
          onPerfilClick={() => setScreen('perfil')}
        />
        {screen === 'gallery' && <Gallery onPlay={handlePlay} />}
        {screen === 'battle' && <Battle npc={selectedNpc} onGameOver={() => setScreen('gallery')} token={user?.token} />}
        {screen === 'login' && <Login onLogin={handleLogin} onBack={() => setScreen('gallery')} />}
        {screen === 'perfil' && <Perfil user={user} onLogout={handleLogout} onBack={() => setScreen('gallery')} />}
      </div>
    </>
  )
}
