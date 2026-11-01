import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader } from '../ui/Card';
import type { ComplianceDistribution } from '../../types';

interface Props {
  data: ComplianceDistribution[];
  title?: string;
  subtitle?: string;
}

export const ComplianceChart: React.FC<Props> = ({
  data,
  title = 'Compliance Status Overview',
  subtitle = 'Rule evaluation breakdown across applications',
}) => {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <Card className="h-full">
      <CardHeader title={title} subtitle={subtitle} />
      {total === 0 ? (
        <div className="h-72 flex items-center justify-center text-sm text-slate-400">
          No evaluation records yet. Run a compliance check to populate chart.
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

