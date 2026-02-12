import Conversation from './Conversation'
import Metrics from './Metrics'

export default function MainContent() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 pt-6 pb-8">
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:gap-2">
        <Conversation />
        <Metrics />
      </div>
    </main>
  )
}
