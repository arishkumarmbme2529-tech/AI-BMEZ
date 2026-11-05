import React, { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import api from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import type { ComplianceRecord, Institution } from '../../types';

export const InfrastructurePage: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [records, setRecords] = useState<ComplianceRecord[]>([]);

  useEffect(() => {
    Promise.all([api.get('/institutions'), api.get('/compliance/records')])
      .then(([instRes, compRes]) => {
        setInstitutions(Array.isArray(instRes.data) ? instRes.data : instRes.data?.items || []);
        setRecords(Array.isArray(compRes.data) ? compRes.data : compRes.data?.items || []);
      })
      .catch(() => {});
  }, []);

  const getInstName = (id: number) =>
    institutions.find((i) => i.id === id)?.name || `Institution #${id}`;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-lg border border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-700" />
          Infrastructure & Campus Facility Verification
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Summary of land area, built-up space, classrooms, laboratories, library holdings, and computing facilities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {records.map((rec) => (
          <Card
            key={rec.id}
            title={getInstName(rec.institution_id)}
            subtitle={`Academic Year ${rec.academic_year} • Infrastructure Score: ${rec.infrastructure_score}%`}
            action={<StatusBadge status={rec.risk_level} />}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Land Area</span>
                <p className="font-bold text-slate-900 mt-0.5">{rec.land_area_acres ?? 10} Acres</p>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Built-up Area</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {rec.built_up_area_sqm.toLocaleString()} Sq.m
                </p>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Classrooms & Labs</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {rec.classrooms_count ?? 20} Rooms / {rec.labs_count ?? 12} Labs
                </p>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Library Volumes</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {rec.library_books_count.toLocaleString()} Books
                </p>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Computer Terminals</span>
                <p className="font-bold text-slate-900 mt-0.5">{rec.computers_count} Systems</p>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Equipment Score</span>
                <p className="font-bold text-slate-900 mt-0.5">{rec.equipment_score}%</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
