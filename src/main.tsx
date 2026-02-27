import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './components/theme-provider'
import './index.css'

// Fix for legacy Service Workers causing CORS errors
// This cleans up any old "Blink" service workers that might be trying to contact core.blink.new
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    if (registrations.length > 0) {
      console.log(`[SW-Cleanup] Found ${registrations.length} legacy service workers. Unregistering...`)
      for (const registration of registrations) {
        console.log('[SW-Cleanup] Unregistering:', registration)
        registration.unregister()
      }
    } else {
      console.log('[SW-Cleanup] No legacy service workers found.')
    }
  }).catch(error => {
    console.error('[SW-Cleanup] Failed to check service workers:', error)
  })
}

// BUILD VERSION CHECK
console.log('🚀 BUILD TIMESTAMP: ' + new Date().toISOString())
console.log('📧 Email Service Endpoint: /.netlify/functions/send-email')

ReactDOM.createRoot(document.getElementById('app-root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme" attribute="class">
      <App />
    </ThemeProvider>
  </React.StrictMode>,
) 