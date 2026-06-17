import { Routes, Route, useParams } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Checkout from './pages/Checkout.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import Admin from './pages/Admin.jsx';
import Gallery from './pages/Gallery.jsx';
import Slideshow from './pages/Slideshow.jsx';
import VirtualBooth from './pages/VirtualBooth.jsx';
import PhotoBooth from './PhotoBooth.jsx';
import LaunchScreen from './components/LaunchScreen.jsx';
import ServiceRequest from './pages/ServiceRequest.jsx';

export default function App() {
  return (
    <Routes>
      {/* Launch / landing */}
      <Route path="/" element={<LaunchScreen />} />

      {/* Full-service request */}
      <Route path="/contact" element={<ServiceRequest />} />

      {/* Host pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/checkout" element={<Checkout />} />

      {/* Admin pages */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<Admin />} />

      {/* Public event pages */}
      <Route path="/gallery/:eventCode" element={<Gallery />} />
      <Route path="/slideshow/:eventCode" element={<Slideshow />} />

      {/* Guest entry point */}
      <Route path="/e/:eventCode" element={<BoothByCode />} />

      {/* Virtual Booth — guest selfie on own phone */}
      <Route path="/v/:eventCode" element={<VirtualBooth />} />

      {/* Default — photo booth */}
      <Route path="*" element={<PhotoBooth />} />
    </Routes>
  );
}

function BoothByCode() {
  const { eventCode } = useParams();
  return <PhotoBooth eventCodeOverride={eventCode} />;
}
