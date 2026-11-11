import React from 'react'
import { Layout, Sidebar, TopNav, PropertyCards, LandingPage, PropertyListings, PropertyDetails, AuthPages, DashboardPages } from './components'

function App() {
  return (
    <div className="min-h-screen bg-navy-50">
      {/* Top Navigation Bar */}
      <TopNav />
      
      {/* Main Content Area */}
      <div className="flex min-h-screen">
        {/* Responsive Sidebar Navigation */}
        <Sidebar />
        
        {/* Content Area */}
        <div className="flex-1 p-8 overflow-x-hidden">
          {/* Route-based content will be rendered here */}
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default App