import React from 'react';
import { LinkedInProfile } from '../types';

interface LikerCardProps {
  profile: LinkedInProfile;
}

export const LikerCard: React.FC<LikerCardProps> = ({ profile }) => {
  return (
    <div className="bg-slate-700 p-4 rounded-lg shadow-lg hover:shadow-sky-500/30 transition-shadow duration-300">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-sky-300">{profile.name}</h3>
        <p className="text-sm text-slate-400">{profile.title}</p>
        {profile.profileUrl && (
          <a 
            href={profile.profileUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-block text-xs text-cyan-400 hover:text-cyan-300 hover:underline break-all"
          >
            View LinkedIn Profile →
          </a>
        )}
      </div>
    </div>
  );
};
    