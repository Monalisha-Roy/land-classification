'use client'
import { CarbonChangeChart, LandCoverPieChart } from "@/components/Charts";
import { useEffect, useState } from "react";

interface LandClassItem {
  class: number;
  className: string;
  areaHa: number;
  percentage: number;
}

export default function LandClassificationCarbonTabs({
  startDateClassification,
  endDateClassification,
  geometry,
  startDate,
  endDate,
}: {
  startDateClassification: LandClassItem[];
  endDateClassification: LandClassItem[];
  geometry: any;
  startDate: string;
  endDate: string;
}) {
  const [activeTab, setActiveTab] = useState<'classification' | 'carbon'>('classification');
  const [agbData, setAgbData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AGB data fetching removed - use /api/satellite instead

  return (
    <div>
      {/* Tab Headers */}
      <div className="border-b-2 border-blue-500/30 bg-slate-700">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('classification')}
            className={`px-6 py-4 text-sm font-bold border-b-4 transition-all ${
              activeTab === 'classification'
                ? 'border-blue-500 text-blue-300 bg-slate-800'
                : 'border-transparent text-blue-400 hover:text-blue-300 hover:border-blue-400'
            }`}
          >
            🗺️ Land Classification
          </button>
          <button
            onClick={() => setActiveTab('carbon')}
            className={`px-6 py-4 text-sm font-bold border-b-4 transition-all ${
              activeTab === 'carbon'
                ? 'border-blue-500 text-blue-300 bg-slate-800'
                : 'border-transparent text-blue-400 hover:text-blue-300 hover:border-blue-400'
            }`}
          >
            🌲 Carbon Stock (AGB)
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'classification' && (
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">Land Cover Distribution</h3>
            <p className="text-sm text-blue-200 mb-6">
              Land classification data from Google Dynamic World AI for both time periods
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Start Date Classification */}
              <div className="bg-slate-700/30 rounded-xl p-5 border border-blue-500/20">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  Start Date ({startDate})
                </h4>
                
                {startDateClassification && startDateClassification.length > 0 ? (
                  <>
                    <div className="mb-4">
                      <LandCoverPieChart 
                        data={startDateClassification.map((c) => ({ 
                          className: c.className, 
                          areaHectares: c.areaHa 
                        }))} 
                      />
                    </div>
                    
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-xs font-semibold text-blue-200 mb-3">Area Breakdown</p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {startDateClassification.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-slate-700/40 rounded text-xs">
                            <span className="text-white font-medium">{item.className}</span>
                            <div className="text-right">
                              <span className="text-blue-200 font-semibold">{item.areaHa.toFixed(2)} ha</span>
                              <span className="text-blue-300 ml-2">({item.percentage.toFixed(1)}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-blue-300">No classification data available</p>
                )}
              </div>

              {/* End Date Classification */}
              <div className="bg-slate-700/30 rounded-xl p-5 border border-blue-500/20">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  End Date ({endDate})
                </h4>
                
                {endDateClassification && endDateClassification.length > 0 ? (
                  <>
                    <div className="mb-4">
                      <LandCoverPieChart 
                        data={endDateClassification.map((c) => ({ 
                          className: c.className, 
                          areaHectares: c.areaHa 
                        }))} 
                      />
                    </div>
                    
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-xs font-semibold text-blue-200 mb-3">Area Breakdown</p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {endDateClassification.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-slate-700/40 rounded text-xs">
                            <span className="text-white font-medium">{item.className}</span>
                            <div className="text-right">
                              <span className="text-blue-200 font-semibold">{item.areaHa.toFixed(2)} ha</span>
                              <span className="text-blue-300 ml-2">({item.percentage.toFixed(1)}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-blue-300">No classification data available</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'carbon' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌲</div>
            <h3 className="text-xl font-bold text-white mb-2">Carbon Stock Analysis</h3>
            <p className="text-blue-200 mb-4">
              AGB calculation feature has been deprecated. 
            </p>
            <p className="text-sm text-blue-300">
              Please use the main Carbon Monitoring page for satellite statistics.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


function MetricCard({ title, value }: { title: string; value: string | undefined }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-blue-500/10">
      <p className="text-xs text-blue-300 mb-1">{title}</p>
      <p className="text-lg font-bold text-white">{value ?? 'N/A'}</p>
    </div>
  );
}
