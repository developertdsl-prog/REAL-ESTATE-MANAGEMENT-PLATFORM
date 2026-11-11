import React from 'react'

const Sidebar = () => {
  return (
    <aside className="w-64 bg-navy-700 h-full border-right border-navy-600 flex-shrink-0 flex flex-col">
      <div className="p-6 text-white">
        <h2 className="text-2xl font-bold text-gold-500 mb-4">RealEstate</h2>
        <nav className="space-y-2">
          <button className="w-full text-left text-navy-100 py-3 px-4 rounded-md hover:bg-navy-600 transition-colors">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a2 2 0 002 2h10a2 2 0 002-2V10M9 12l2 2m0-4l-2 2m2-2v7h-2V12m4-6v6h2V12m-6 4h6m-5-10a7 7 0 1114 0 7 7 0 01-14 0z" />
            </svg>
            Dashboard
          </button>
          <button className="w-full text-left text-navy-100 py-3 px-4 rounded-md hover:bg-navy-600 transition-colors">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a2 2 0 002 2h10a2 2 0 002-2V10M9 12l2 2m0-4l-2 2m2-2v7h-2V12m-6 4h6m-5-10a7 7 0 1114 0 7 7 0 01-14 0z" />
            </svg>
            Properties
          </button>
          <button className="w-full text-left text-navy-100 py-3 px-4 rounded-md hover:bg-navy-600 transition-colors">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6h2V7H10m5 4v1h2v-1h-2m0 0v8h2v-8H15m-4-4h12a2 2 0 002-2V5a2 2 0 00-2-2h-3l-2 6h5v2H8v-2H5v2h3l2-6a2 2 0 00-2-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7z" />
            </svg>
            Listings
          </button>
          <button className="w-full text-left text-navy-100 py-3 px-4 rounded-md hover:bg-navy-600 transition-colors">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 5v14M8 12l4 4 4-4" />
            </svg>
            Search
          </button>
          <button className="w-full text-left text-navy-100 py-3 px-4 rounded-md hover:bg-navy-600 transition-colors">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-4a4.8 4.8 0 0 0-4.8-4.8H5a4.8 4.8 0 0 0-4.8 4.8v4m0 0h4.8M8 12l4 4 4-4" />
            </svg>
            Favorites
          </button>
        </nav>
      </div>
    </aside>
  )
}

export default Sidebar