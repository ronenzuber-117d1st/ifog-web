import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Catch pre-React crashes (store init, module errors) and show them in the DOM
window.onerror = (msg, _src, _line, _col, err) => {
  document.body.innerHTML = `<div style="background:#0a0f1d;color:#ff7a6b;padding:32px;font-family:monospace;white-space:pre-wrap;font-size:13px">
<div style="color:#c8f53d;font-weight:700;margin-bottom:16px">STARTUP ERROR</div>${err?.stack ?? msg}
<div style="margin-top:24px">
<button onclick="localStorage.removeItem('ifog-game-state');location.reload()"
  style="padding:10px 20px;background:#c8f53d;color:#070b16;border:none;border-radius:8px;font-weight:700;cursor:pointer">
  Clear save &amp; reload
</button></div></div>`;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
