
import React from 'react';
import { LinkedInPost } from '../types';

interface PostDisplayProps {
  post: LinkedInPost;
}

export const PostDisplay: React.FC<PostDisplayProps> = ({ post }) => {
  return (
    <div className="mt-6 p-4 bg-slate-700 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-sky-300 mb-2">Current Post Context:</h3>
      <p className="text-slate-300 text-sm whitespace-pre-wrap">{post.content}</p>
    </div>
  );
};
    