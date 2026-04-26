import { createRoot } from 'react-dom/client'
import './index.css'
import 'katex/dist/katex.min.css'
import { Playground } from './components/Playground'

createRoot(document.getElementById('root')!).render(<Playground />)
