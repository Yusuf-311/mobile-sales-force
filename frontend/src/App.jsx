import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext.jsx';
import { AppRouter }     from './router/AppRouter.jsx';
import NavBar            from './components/NavBar.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="app-shell">
          <NavBar />
          <main className="page-content">
            <AppRouter />
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
