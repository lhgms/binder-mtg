import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BinderPage from './pages/Binder';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/binder/:id" element={<BinderPage />} />
      </Routes>
    </BrowserRouter>
  );
}
