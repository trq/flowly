import logo from '../../assets/fl-lg.png'

export default function Header() {
  return (
    <header className="h-30 border-b border-(--content-border)">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center">
        <img src={logo} alt="Flowly logo" className="h-10 w-auto object-contain" />
      </div>
    </header>
  )
}
