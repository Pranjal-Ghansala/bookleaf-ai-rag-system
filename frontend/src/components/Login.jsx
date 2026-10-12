import React, { useState } from 'react';
import axios from 'axios';

export default function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isLogin ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/login` : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/register`;
      const payload = isLogin ? { email, password } : { name, email, password, role: 'author' };

      const res = await axios.post(endpoint, payload);

      if (isLogin) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        onLoginSuccess(res.data.token, res.data.user);
      } else {
        alert('Registration successful! Please log in.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 border border-gray-200">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-indigo-900">BookLeaf Publishing</h1>
          <p className="text-sm text-gray-500">Author Support & Communication Portal</p>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full border border-gray-300 rounded p-2 text-sm" 
                required 
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full border border-gray-300 rounded p-2 text-sm" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full border border-gray-300 rounded p-2 text-sm" 
              required 
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-semibold py-2 rounded text-sm hover:bg-indigo-700">
            {isLogin ? 'Sign In' : 'Register Author Account'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-xs text-indigo-600 hover:underline"
          >
            {isLogin ? "Don't have an account? Register here" : 'Already have an account? Sign in'}
          </button>
        </div>

        {/* <div className="mt-6 border-t pt-4 text-xs text-gray-400 text-center">
          <p>Demo Admin: admin@bookleaf.com / admin123</p>
          <p>Demo Author: aarav@example.com / password123</p>
        </div> */}
      </div>
    </div>
  );
}