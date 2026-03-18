import { ErrorBoundary } from './components/ErrorBoundary'
import { ScraperProvider } from './contexts/ScraperContext'
import ScrapingPlaybook from './components/ScrapingPlaybook'

function App() {
  return (
    <ErrorBoundary>
      <ScraperProvider>
        <ScrapingPlaybook />
      </ScraperProvider>
    </ErrorBoundary>
  )
}

export default App
