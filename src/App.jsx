import React, { useState } from 'react';
import { Upload, LayoutDashboard, History, LogOut } from 'lucide-react';
import ScheduleUploadPage from './components/ScheduleUploadPage';
import DeploymentDashboard from './components/DeploymentDashboard';
import HistoryPage from './components/HistoryPage';

function App() {
  const [currentPage, setCurrentPage] = useState('upload');

  const handleUploadComplete = () => {
    setCurrentPage('dashboard');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'upload':
        return <ScheduleUploadPage onUploadComplete={handleUploadComplete} />;
      case 'dashboard':
        return <DeploymentDashboard />;
      case 'history':
        return <HistoryPage />;
      default:
        return <ScheduleUploadPage onUploadComplete={handleUploadComplete} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">KFC</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">Shift Deployment System</h1>
                <p className="text-xs text-gray-500">Automated Staff Scheduling</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage('upload')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'upload'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span className="font-medium">Upload</span>
              </button>

              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="font-medium">Dashboard</span>
              </button>

              <button
                onClick={() => setCurrentPage('history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <History className="w-4 h-4" />
                <span className="font-medium">History</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="min-h-[calc(100vh-64px)]">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
