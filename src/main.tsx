import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/chakra-petch/700.css'
import '@fontsource-variable/space-grotesk/wght.css'
import './style.css'
import App from './App'

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>)
