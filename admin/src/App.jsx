import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { AuthProvider } from './lib/auth.jsx';
import { LanguageProvider } from './lib/language-context.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import ProjectForm from './pages/ProjectForm.jsx';
import Projects from './pages/Projects.jsx';
import ResourceForm from './pages/ResourceForm.jsx';
import ResourceList from './pages/ResourceList.jsx';
import ContactSubmissions from './pages/ContactSubmissions.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/new" element={<ProjectForm />} />
              <Route path="projects/:projectId/edit" element={<ProjectForm />} />
              <Route path="experience" element={<ResourceList type="experience" />} />
              <Route path="experience/new" element={<ResourceForm type="experience" />} />
              <Route path="experience/:itemId/edit" element={<ResourceForm type="experience" />} />
              <Route path="education" element={<ResourceList type="education" />} />
              <Route path="education/new" element={<ResourceForm type="education" />} />
              <Route path="education/:itemId/edit" element={<ResourceForm type="education" />} />
              <Route path="certifications" element={<ResourceList type="certification" />} />
              <Route path="certifications/new" element={<ResourceForm type="certification" />} />
              <Route path="certifications/:itemId/edit" element={<ResourceForm type="certification" />} />
              <Route path="contact-submissions" element={<ContactSubmissions />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

