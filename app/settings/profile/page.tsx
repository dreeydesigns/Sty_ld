'use client';
import { useEffect, useState } from 'react';

export default function SecuritySettings() {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/auth/sessions')
      .then(res => res.json())
      .then(data => {
        if (data.sessions) setSessions(data.sessions);
      });
  }, []);

  const handleRevoke = async (id: string) => {
    // Ensure your signout route handles DELETE or POST with body
    await fetch('/api/auth/signout', { 
      method: 'POST', 
      body: JSON.stringify({ sessionId: id }) 
    });
    setSessions(sessions.filter(s => s.id !== id));
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Active Devices</h1>
      {sessions.map((s: any) => (
        <div key={s.id} className="border-b py-4 flex justify-between">
          <div>
            <p className="font-semibold">{s.device_name || 'Unknown Device'}</p>
            <p className="text-sm text-gray-500">{s.browser || 'Unknown Browser'}</p>
          </div>
          <button onClick={() => handleRevoke(s.id)} className="text-red-500 text-sm">
            Revoke
          </button>
        </div>
      ))}
    </div>
  );
}