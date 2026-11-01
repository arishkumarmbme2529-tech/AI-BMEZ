import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { clsx } from 'clsx';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

export const MainLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      <div
        className={clsx(
          'flex-1 flex flex-col min-w-0 transition-all duration-300',
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        )}
      >
        <TopNav onToggleSidebar={() => setSidebarCollapsed((c) => !c)} />
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

