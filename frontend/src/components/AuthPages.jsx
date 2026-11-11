import React, { useState } from 'react'

const AuthPages = () => {
  const [mode, setMode] = useState('login') // 'login' or 'register'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  })
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    // TODO: Implement auth submission
    if (formData.email && formData.password) {
      setError('')
      // In a real app, this would call the auth API
      alert(`Successfully ${mode === 'login' ? 'logged in' : 'registered'}!`)
    } else {
      setError('Please fill in all required fields')
    }
  }

  return (
    <div className="min-h-screen bg-navy-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-extrabold text-navy-800">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <button 
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-navy-400 text-sm hover:text-navy-600 transition-colors"
          >
            {mode === 'login' ? 'Create Account' : 'Login'}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border-red-400 text-red-700 rounded-md px-4 py-3 mb-6 alert">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-navy-500 text-sm font-medium mb-2">
              Email address
            </label>
            <input 
              id="email" 
              type="email" 
              value={formData.email} 
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
              required 
              className="bg-navy-50 border border-navy-300 rounded-lg w-full p-3 text-navy-600 focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300 transition-colors"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-navy-500 text-sm font-medium mb-2">
              Password
            </label>
            <input 
              id="password" 
              type="password" 
              value={formData.password} 
              onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
              required 
              className="bg-navy-50 border border-navy-300 rounded-lg w-full p-3 text-navy-600 focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300 transition-colors"
            />
          </div>
          
          {mode === 'register' && (
            <div>
              <label htmlFor="name" className="block text-navy-500 text-sm font-medium mb-2">
                Full name
              </label>
              <input 
                id="name" 
                type="text" 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                required 
                className="bg-navy-50 border border-navy-300 rounded-lg w-full p-3 text-navy-600 focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300 transition-colors"
              />
            </div>
          )}
          
          <button type="submit" className="w-full bg-gold-600 text-white py-3 rounded-full font-medium hover:bg-gold-500 transition-colors">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AuthPages