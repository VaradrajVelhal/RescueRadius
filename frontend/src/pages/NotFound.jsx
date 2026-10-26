import React from 'react';
import { Link } from 'react-router-dom';
import RescueRadiusEmblem from '../components/RescueRadiusEmblem';

const NotFound = () => {
  return (
    <div className="min-h-[55vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-[#F6F4EE] border border-[#E5E2D6] flex items-center justify-center mx-auto shadow-2xs">
        <RescueRadiusEmblem size={36} variant="mark" className="text-[#143627]" />
      </div>
      <div className="text-4xl sm:text-5xl font-mono font-bold text-[#143627]">
        404
      </div>
      <h1 className="font-serif text-2xl font-bold text-slate-900">
        Coordinates Off Grid
      </h1>
      <p className="text-slate-600 text-sm max-w-md font-sans leading-relaxed">
        The requested field record or dispatch route does not exist or has been archived. Check your coordinate link or return to station headquarters.
      </p>
      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex items-center px-5 py-2.5 bg-[#143627] hover:bg-[#1B4532] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-2xs"
        >
          Return to Headquarters →
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
