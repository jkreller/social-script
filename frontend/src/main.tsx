import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './theme.css'
import App from './App'
import TeaserScreen from './screens/TeaserScreen'

// iOS-installed PWAs can leave a dead, badly-rendered strip behind the home indicator
// (see git history) — the .pwa class lets theme.css sit closer to that edge there only.
// display-mode media query doesn't reliably report standalone for
// apple-mobile-web-app-capable launches, so navigator.standalone is the real signal.
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPadOS reports as Mac
const isInstalled = (navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches
if (isIOS && isInstalled) document.documentElement.classList.add('pwa')

// /psssssssssst is a hidden QR-code teaser, entirely separate from the Home/Runner app below.
const isTeaser = window.location.pathname === '/psssssssssst'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isTeaser ? <TeaserScreen /> : <App />}
  </StrictMode>,
)
