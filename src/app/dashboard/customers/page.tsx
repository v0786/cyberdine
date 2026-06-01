'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CustomersPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Customers</h1>
      <p className="text-zinc-400 mb-6">Coming soon...</p>
      <Card className="bg-[#0a0a0a] border-zinc-800">
        <CardHeader>
          <CardTitle>Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-500">This page is under construction</p>
        </CardContent>
      </Card>
    </div>
  );
}
