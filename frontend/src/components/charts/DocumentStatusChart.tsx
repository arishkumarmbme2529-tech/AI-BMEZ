import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card, CardHeader } from '../ui/Card';
import type { DocumentStatusDistribution } from '../../types';

interface Props {
  data: DocumentStatusDistribution[];
}

export const DocumentStatusChart: React.FC<Props> = ({ data }) => {
  return (
    <Card className="h-full">
      <CardHeader
        title="Document Verification Statistics"
        subtitle="Status breakdown of uploaded institutional documents"
      />
      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-slate-400">
          No documents uploaded yet.
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                }}
              />
              <Bar dataKey="count" name="Documents" fill="#06b6d4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

