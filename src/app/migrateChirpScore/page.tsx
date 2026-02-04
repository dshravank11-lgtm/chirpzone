'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { migrateChirpsScores } from '@/scripts/migrate-chirpscore';

export default function MigrateChirpScorePage() {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState('');

  const handleMigration = async () => {
    setMigrating(true);
    try {
      await migrateChirpScores();
      setResult('Migration completed successfully!');
    } catch (error: any) {
      console.error('Migration failed:', error);
      setResult(`Migration failed: ${error.message}`);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Chirp Score Migration</h1>
      <p className="mb-4">
        Click the button below to migrate the chirp scores for all users.
      </p>
      <Button onClick={handleMigration} disabled={migrating}>
        {migrating ? 'Migrating...' : 'Start Migration'}
      </Button>
      {result && <p className="mt-4 text-green-600">{result}</p>}
    </div>
  );
}
