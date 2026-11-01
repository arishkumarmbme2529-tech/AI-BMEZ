import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader } from '../ui/Card';
import type { MonthlyTrendPoint } from '../../types';

interface Props {
  data: MonthlyTrendPoint[];
}

export const ApplicationTrendChart: React.FC<Props> = ({ data }) => {
  return (
    <Card className="h-full">
      <CardHeader
        title="Monthly Application & Document Trends"
        subtitle="6-month activity overview from database records"
      />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDocs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="applications"
              name="Applications"
              stroke="#1e3a5f"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorApps)"
            />
            <Area
              type="monotone"
              dataKey="documents"
              name="Uploaded Documents"
              stroke="#06b6d4"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorDocs)"
            />
            <Area
              type="monotone"
              dataKey="approved"
              name="Approved"
              stroke="#22c55e"
              strokeWidth={2}
              fillOpacity={0}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

