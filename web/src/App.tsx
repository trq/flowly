import Header from './components/layout/Header'
import MainContent from './components/layout/MainContent'

export default function App() {
  return (
    <div className="dark flex min-h-screen flex-col bg-(--page-bg)">
      <Header />
      <MainContent />
    </div>
  )
}
