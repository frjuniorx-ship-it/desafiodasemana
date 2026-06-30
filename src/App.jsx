import { useState } from 'react'
import Background from './components/Background'
import Header from './components/Header'
import Gallery from './components/Gallery'
import Battle from './components/Battle'
import './App.css'

export default function App() {
  const [screen, setScreen] = useState('gallery')

  const breadcrumb = screen === 'battle'
    ? 'Desafio da Semana › Boitatá · turno 07'
    : 'Modo Aventura › Desafios › Semanal'

  return (
    <>
      <Background />
      <div style={{ position: 'relative', zIndex: 3, minHeight: '100vh' }}>
        <Header
          isBattle={screen === 'battle'}
          onBack={() => setScreen('gallery')}
          breadcrumb={breadcrumb}
        />
        {screen === 'gallery'
          ? <Gallery onPlay={() => setScreen('battle')} />
          : <Battle />
        }
      </div>
    </>
  )
}
