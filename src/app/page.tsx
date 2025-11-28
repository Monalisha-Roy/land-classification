'use client';

import { useState, useCallback, useEffect } from 'react';
import { Feature, Polygon } from 'geojson';
import dynamic from 'next/dynamic';
import { LandCoverPieChart, CarbonChangeChart } from '@/components/Charts';
import SatelliteResults from '@/components/SatelliteResults';

// Dynamically import MapComponent to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-slate-700 rounded-lg flex items-center justify-center">
      <p className="text-white">Loading map...</p>
    </div>
  ),
});

interface CarbonPool {
  agb: number | null;
  bgb: number | null;
  deadWood: number | null;
  litter: number | null;
  soc: number | null;
}

interface LandClassItem {
  class: number;
  className: string;
  areaHa: number;
  percentage: number;
}

interface DataPoint {
  date: string;
  coordinates: any;
  totalAreaHa: number;
  landClassification: LandClassItem[];
  carbonPools: CarbonPool;
  dataQuality: {
    imageCount: number;
    temporalWindow: string;
    dataAvailable: boolean;
  };
}

interface CarbonMonitoringData {
  startDate: DataPoint;
  endDate: DataPoint;
  timePeriod: {
    startDate: string;
    endDate: string;
    durationDays: number;
    durationYears: number;
  };
  metadata: any;
}

interface SatelliteData {
  statistics: any;
  dataQuality: any;
  dateRange: any;
  warnings?: string[];
}

export default function CarbonMonitoringPage() {
  const [polygon, setPolygon] = useState<Feature<Polygon> | null>(null);
  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState('2024-01-01');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [satelliteData, setSatelliteData] = useState<SatelliteData | null>(null);

  const handlePolygonCreated = useCallback((geojson: Feature<Polygon>) => {
    setPolygon(geojson);
    setError(null);
    setSatelliteData(null);
  }, []);

  const handleAnalyze = async () => {
    if (!polygon) {
      setError('Please draw a polygon on the map first');
      return;
    }

    setLoading(true);
    setError(null);
    setSatelliteData(null);

    try {
      // Fetch satellite statistics
      const satelliteResponse = await fetch('/api/satellite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geometry: polygon.geometry,
          startDate,
          endDate,
          cloudCoverMax: 20,
        }),
      });

      if (!satelliteResponse.ok) {
        const errorData = await satelliteResponse.json();
        throw new Error(errorData.error || 'Failed to fetch satellite data');
      }

      const satelliteResult = await satelliteResponse.json();
      setSatelliteData(satelliteResult.data);
      console.log('Satellite data fetched:', satelliteResult.data);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'An error occurred during analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Carbon Monitoring System
          </h1>
          <p className="text-blue-200">
            Comprehensive satellite data collection for carbon stock assessment
          </p>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
              <h2 className="text-xl font-semibold text-white mb-4">
                📍 Draw Polygon Area
              </h2>
              <div className="rounded-lg overflow-hidden border-2 border-blue-500/50">
                <MapComponent
                  onPolygonCreated={handlePolygonCreated}
                />
              </div>
            </div>
          </div>

          {/* Date Controls */}
          <div className="space-y-4">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30">
              <h2 className="text-xl font-semibold text-white mb-4">
                📅 Analysis Settings
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-blue-500/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-blue-500/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={loading || !polygon}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Analyzing...' : '🔍 Get Satellite Statistics'}
                </button>
              </div>

              {polygon && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-200">
                    ✅ Polygon defined with {polygon.geometry.coordinates[0].length} points
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-200">❌ {error}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        {satelliteData && <SatelliteResults data={satelliteData} />}
      </div>
    </div>
  );
}


