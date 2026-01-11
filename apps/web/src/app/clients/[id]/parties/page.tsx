'use client';

import { useParams } from 'next/navigation';

export default function ClientPartiesPage() {
  const params = useParams();
  const clientId = params.id as string;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Client Parties
        </h1>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-gray-600">
            Parties management for client ID: {clientId}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This page is under development.
          </p>
        </div>
      </div>
    </div>
  );
}