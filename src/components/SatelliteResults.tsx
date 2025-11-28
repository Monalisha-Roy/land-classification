'use client';

import { useState } from 'react';

interface SatelliteResultsProps {
  data: {
    statistics: {
      NDVI_mean?: number;
      NDVI_min?: number;
      NDVI_max?: number;
      EVI_mean?: number;
      EVI_min?: number;
      EVI_max?: number;
      LAI_mean?: number;
      LAI_min?: number;
      LAI_max?: number;
      VV_mean?: number;
      VV_min?: number;
      VV_max?: number;
      VH_mean?: number;
      VH_min?: number;
      VH_max?: number;
      RVI_mean?: number;
      RVI_min?: number;
      RVI_max?: number;
      CanopyHeight_mean?: number;
      CanopyHeight_min?: number;
      CanopyHeight_max?: number;
    };
    dataQuality: {
      sentinel2Images: number;
      sentinel1Images: number;
      gediAvailable: boolean;
    };
    dateRange: {
      startDate: string;
      endDate: string;
    };
    warnings?: string[];
  };
}

export default function SatelliteResults({ data }: SatelliteResultsProps) {
  const [activeTab, setActiveTab] = useState<'sentinel2' | 'sentinel1' | 'gedi'>('sentinel2');
  const { statistics, dataQuality, dateRange, warnings } = data;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-blue-500/30 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          🛰️ Multi-Sensor Satellite Statistics
        </h2>
        <p className="text-blue-100 text-sm mt-1">
          {dateRange.startDate} to {dateRange.endDate}
        </p>
      </div>

      {/* Data Quality Overview */}
      <div className="p-6 border-b border-blue-500/30">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          📊 Data Quality
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-700/50 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">Sentinel-2 Images</p>
                <p className="text-2xl font-bold text-white">{dataQuality.sentinel2Images}</p>
              </div>
              <div className="text-3xl">📡</div>
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">Sentinel-1 Images</p>
                <p className="text-2xl font-bold text-white">{dataQuality.sentinel1Images}</p>
              </div>
              <div className="text-3xl">📡</div>
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">GEDI Data</p>
                <p className="text-2xl font-bold text-white">
                  {dataQuality.gediAvailable ? '✅ Available' : '❌ No Data'}
                </p>
              </div>
              <div className="text-3xl">🌳</div>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="p-6 border-b border-blue-500/30">
          <div className="bg-orange-900/20 border border-orange-500/50 rounded-lg p-4">
            <h4 className="text-sm font-bold text-orange-300 mb-2 flex items-center gap-2">
              ⚠️ Warnings
            </h4>
            <ul className="list-disc list-inside text-sm text-orange-200 space-y-1">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-blue-500/30 bg-slate-700/50">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('sentinel2')}
            className={`px-6 py-4 text-sm font-bold border-b-4 transition-all ${
              activeTab === 'sentinel2'
                ? 'border-blue-500 text-blue-300 bg-slate-800'
                : 'border-transparent text-blue-400 hover:text-blue-300 hover:border-blue-400'
            }`}
          >
            📡 Sentinel-2 (Optical)
          </button>
          <button
            onClick={() => setActiveTab('sentinel1')}
            className={`px-6 py-4 text-sm font-bold border-b-4 transition-all ${
              activeTab === 'sentinel1'
                ? 'border-blue-500 text-blue-300 bg-slate-800'
                : 'border-transparent text-blue-400 hover:text-blue-300 hover:border-blue-400'
            }`}
          >
            📡 Sentinel-1 (SAR)
          </button>
          <button
            onClick={() => setActiveTab('gedi')}
            className={`px-6 py-4 text-sm font-bold border-b-4 transition-all ${
              activeTab === 'gedi'
                ? 'border-blue-500 text-blue-300 bg-slate-800'
                : 'border-transparent text-blue-400 hover:text-blue-300 hover:border-blue-400'
            }`}
            disabled={!dataQuality.gediAvailable}
          >
            🌳 GEDI (LiDAR)
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'sentinel2' && (
          <Sentinel2Statistics statistics={statistics} />
        )}
        {activeTab === 'sentinel1' && (
          <Sentinel1Statistics statistics={statistics} />
        )}
        {activeTab === 'gedi' && (
          <GEDIStatistics statistics={statistics} available={dataQuality.gediAvailable} />
        )}
      </div>
    </div>
  );
}

function Sentinel2Statistics({ statistics }: { statistics: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          🌿 Vegetation Indices
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="NDVI"
            subtitle="Normalized Difference Vegetation Index"
            mean={statistics.NDVI_mean}
            min={statistics.NDVI_min}
            max={statistics.NDVI_max}
            unit=""
            gradient="from-green-500/20 to-emerald-500/20"
            description="Measures vegetation health (-1 to 1)"
          />
          <StatCard
            title="EVI"
            subtitle="Enhanced Vegetation Index"
            mean={statistics.EVI_mean}
            min={statistics.EVI_min}
            max={statistics.EVI_max}
            unit=""
            gradient="from-emerald-500/20 to-teal-500/20"
            description="Improved sensitivity in high biomass areas"
          />
          <StatCard
            title="LAI"
            subtitle="Leaf Area Index"
            mean={statistics.LAI_mean}
            min={statistics.LAI_min}
            max={statistics.LAI_max}
            unit="m²/m²"
            gradient="from-teal-500/20 to-cyan-500/20"
            description="Total leaf area per ground area"
          />
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <h4 className="text-sm font-bold text-blue-200 mb-2">📖 About Sentinel-2</h4>
        <p className="text-sm text-blue-100">
          Sentinel-2 provides high-resolution optical imagery. NDVI and EVI measure vegetation health,
          while LAI estimates the total leaf area. Higher values typically indicate healthier, denser vegetation.
        </p>
      </div>
    </div>
  );
}

function Sentinel1Statistics({ statistics }: { statistics: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          📡 SAR Radar Measurements
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="VV Polarization"
            subtitle="Vertical-Vertical Backscatter"
            mean={statistics.VV_mean}
            min={statistics.VV_min}
            max={statistics.VV_max}
            unit="dB"
            gradient="from-blue-500/20 to-indigo-500/20"
            description="Sensitive to soil moisture and vegetation structure"
          />
          <StatCard
            title="VH Polarization"
            subtitle="Vertical-Horizontal Backscatter"
            mean={statistics.VH_mean}
            min={statistics.VH_min}
            max={statistics.VH_max}
            unit="dB"
            gradient="from-indigo-500/20 to-purple-500/20"
            description="Highly sensitive to vegetation volume"
          />
          <StatCard
            title="RVI"
            subtitle="Radar Vegetation Index"
            mean={statistics.RVI_mean}
            min={statistics.RVI_min}
            max={statistics.RVI_max}
            unit=""
            gradient="from-purple-500/20 to-pink-500/20"
            description="Combined indicator of vegetation presence"
          />
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <h4 className="text-sm font-bold text-blue-200 mb-2">📖 About Sentinel-1</h4>
        <p className="text-sm text-blue-100">
          Sentinel-1 uses radar (SAR) technology that penetrates clouds and works day/night. VV and VH
          polarizations measure different aspects of surface and vegetation structure. RVI combines these
          to estimate vegetation density.
        </p>
      </div>
    </div>
  );
}

function GEDIStatistics({ statistics, available }: { statistics: any; available: boolean }) {
  if (!available) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🌳</div>
        <h3 className="text-xl font-bold text-white mb-2">No GEDI Data Available</h3>
        <p className="text-blue-200">
          GEDI canopy height data is not available for this region or time period.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          🌲 Canopy Height Measurements
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Canopy Height"
            subtitle="RH98 - 98th Percentile Height"
            mean={statistics.CanopyHeight_mean}
            min={statistics.CanopyHeight_min}
            max={statistics.CanopyHeight_max}
            unit="m"
            gradient="from-green-600/20 to-green-500/20"
            description="Tree canopy height from LiDAR"
          />
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <h4 className="text-sm font-bold text-blue-200 mb-2">📖 About GEDI</h4>
        <p className="text-sm text-blue-100">
          GEDI (Global Ecosystem Dynamics Investigation) uses LiDAR technology from the International
          Space Station to measure forest canopy height with high precision. RH98 represents the height
          of the 98th percentile of canopy returns, providing an accurate estimate of tree height.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  title,
  subtitle,
  mean,
  min,
  max,
  unit,
  gradient,
  description,
}: {
  title: string;
  subtitle: string;
  mean?: number;
  min?: number;
  max?: number;
  unit: string;
  gradient: string;
  description: string;
}) {
  const formatValue = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toFixed(3);
  };

  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl p-5 shadow-lg border-2 border-blue-400/30 backdrop-blur-sm`}>
      <h4 className="text-sm font-bold text-white mb-1">{title}</h4>
      <p className="text-xs text-blue-200 mb-3">{subtitle}</p>
      
      <div className="space-y-2 mb-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-blue-200">Mean:</span>
          <span className="text-lg font-bold text-white">
            {formatValue(mean)} {unit}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-blue-200">Min:</span>
          <span className="text-sm font-semibold text-blue-100">
            {formatValue(min)} {unit}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-blue-200">Max:</span>
          <span className="text-sm font-semibold text-blue-100">
            {formatValue(max)} {unit}
          </span>
        </div>
      </div>
      
      <p className="text-xs text-blue-300 italic border-t border-blue-400/20 pt-2">
        {description}
      </p>
    </div>
  );
}
