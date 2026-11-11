import React from 'react'

const TopNav = () => {
  return (
    <header className="bg-white shadow border-b border-navy-100 h-16 flex items-center px-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-navy-600">RealEstate Platform</h1>
      </div>
      
      <div className="ml-auto flex items-center space-x-4">
        <button className="hidden sm:block bg-gold-50 text-gold-600 px-4 py-2 rounded-md hover:bg-gold-100 transition-colors">
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 6.252a5.75 5.75 0 1 1 0 11.5 5.75 5.75 0 0 1 0-11.5zm0 5.75a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm0 11.5a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5z" />
          </svg>
          Notify
        </button>
        
        <div className="relative">
          <button className="bg-white rounded-full p-2 hover:bg-navy-50 transition-colors">
            <svg className="w-6 h-6 text-navy-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 2.25a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5z" />
            </svg>
          </button>
          <div className="absolute right-0 top-14 w-48 bg-white rounded-md shadow-lg py-2 px-4 min-w max-w-xs hidden md:block" style={{ border: '1px solid #e2e8f0' }}>
            <div className="flex items-center border-b pb-2 mb-2">
              <svg className="w-5 h-5 text-navy-400 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 2.25a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5z" />
              </svg>
              <span className="font-medium">Admin User</span>
            </div>
            <a href="#" className="text-sm text-navy-600 hover:text-gold-500 transition-colors block py-1 px-2">Profile</a>
            <a href="#" className="text-sm text-navy-600 hover:text-gold-500 transition-colors block py-1 px-2">Settings</a>
            <a href="#" className="text-sm text-navy-600 hover:text-gold-500 transition-colors block py-1 px-2">Logout</a>
          </div>
        </div>
      </div>
    </header>
  )
}

export default TopNav