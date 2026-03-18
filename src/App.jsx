import { ErrorBoundary } from './components/ErrorBoundary'
import ScrapingPlaybook from './components/ScrapingPlaybook'

function App() {
  return (
    <ErrorBoundary>
      <ScrapingPlaybook />
    </ErrorBoundary>
  )
}

export default App
