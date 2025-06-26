
import React, { useState } from 'react';

interface LikerInputFormProps {
  onAddLiker: (name: string, title: string, bio?: string, profileUrl?: string) => void;
}

export const LikerInputForm: React.FC<LikerInputFormProps> = ({ onAddLiker }) => {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [profileUrl, setProfileUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && title.trim()) {
      onAddLiker(name.trim(), title.trim(), bio.trim(), profileUrl.trim());
      setName('');
      setTitle('');
      setBio('');
      setProfileUrl('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <h2 className="text-2xl font-semibold text-sky-400 mb-1">Add New Profile</h2>
      <p className="text-sm text-slate-400 mb-3">Enter details of individuals who liked the post.</p>
      <div>
        <label htmlFor="liker-name" className="block text-sm font-medium text-slate-300">Name*</label>
        <input
          id="liker-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Jane Doe"
          required
          className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm placeholder-slate-500 text-slate-200"
        />
      </div>
      <div>
        <label htmlFor="liker-title" className="block text-sm font-medium text-slate-300">Title*</label>
        <input
          id="liker-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Software Engineer @ Google"
          required
          className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm placeholder-slate-500 text-slate-200"
        />
      </div>
      <div>
        <label htmlFor="liker-bio" className="block text-sm font-medium text-slate-300">Bio (Optional)</label>
        <textarea
          id="liker-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Brief bio or summary for better analysis..."
          rows={3}
          className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm placeholder-slate-500 text-slate-200 resize-none"
        />
      </div>
      <div>
        <label htmlFor="liker-url" className="block text-sm font-medium text-slate-300">Profile URL (Optional)</label>
        <input
          id="liker-url"
          type="url"
          value={profileUrl}
          onChange={(e) => setProfileUrl(e.target.value)}
          placeholder="e.g., https://linkedin.com/in/janedoe"
          className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm placeholder-slate-500 text-slate-200"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-150 ease-in-out shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3.004 15c-.004-.154.004-.307.013-.46a3.75 3.75 0 0 1 7.48-1.582.075.075 0 0 0 .096.096A3.75 3.75 0 0 1 15.39 12c.11-.005.22-.008.332-.008A4.5 4.5 0 0 1 20.25 15v.75c0 .354.025.701.072 1.043a4.501 4.501 0 0 1-8.456 2.443A3.75 3.75 0 0 1 3.751 18c-.029 0-.057-.002-.085-.005A4.507 4.507 0 0 1 3.004 15Z" />
        </svg>
        <span>Add Profile</span>
      </button>
    </form>
  );
};
    