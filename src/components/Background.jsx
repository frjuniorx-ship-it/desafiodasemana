export default function Background() {
  return (
    <>
      {/* Gradiente base */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse at 20% 0%, rgba(58,82,52,.35), transparent 55%),
          radial-gradient(ellipse at 80% 100%, rgba(13,27,42,.55), transparent 60%),
          radial-gradient(ellipse at 50% 50%, rgba(61,40,23,.25), transparent 70%),
          linear-gradient(180deg, #0d1b13 0%, #0b1612 40%, #0a1219 100%)`
      }} />
      {/* Textura pergaminho */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', opacity: .08,
        mixBlendMode: 'overlay', zIndex: 1,
        backgroundImage: `
          repeating-linear-gradient(43deg, rgba(232,213,168,.4) 0 1px, transparent 1px 3px),
          repeating-linear-gradient(127deg, rgba(232,213,168,.3) 0 1px, transparent 1px 5px)`
      }} />
      {/* Vinheta */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        boxShadow: 'inset 0 0 200px rgba(0,0,0,.7)', zIndex: 2
      }} />
    </>
  );
}
