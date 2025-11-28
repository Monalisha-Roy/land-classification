interface AGBData {
  startDate: {
    targetDate: string;
    actualDataRange: { start: string; end: string };
    agb: {
      meanAGB: number;
      minAGB: number;
      maxAGB: number;
      stdDevAGB: number;
      totalBiomass: number;
      areaHa: number;
      agbRasterUrl: string;
    };
    inputMetrics: {
      ndvi: { mean: number; min: number; max: number };
      evi: { mean: number; min: number; max: number };
      lai: { mean: number; min: number; max: number };
      vh: { mean: number; min: number; max: number };
      vv: { mean: number; min: number; max: number };
      rvi: { mean: number; min: number; max: number };
      canopyHeight: { mean: number; min: number; max: number } | null;
    };
    dataQuality: {
      sentinel2Images: number;
      sentinel1Images: number;
      gediFootprints: number;
      temporalRange: string;
    };
    warnings: string[];
  };
  endDate: {
    targetDate: string;
    actualDataRange: { start: string; end: string };
    agb: {
      meanAGB: number;
      minAGB: number;
      maxAGB: number;
      stdDevAGB: number;
      totalBiomass: number;
      areaHa: number;
      agbRasterUrl: string;
    };
    inputMetrics: {
      ndvi: { mean: number; min: number; max: number };
      evi: { mean: number; min: number; max: number };
      lai: { mean: number; min: number; max: number };
      vh: { mean: number; min: number; max: number };
      vv: { mean: number; min: number; max: number };
      rvi: { mean: number; min: number; max: number };
      canopyHeight: { mean: number; min: number; max: number } | null;
    };
    dataQuality: {
      sentinel2Images: number;
      sentinel1Images: number;
      gediFootprints: number;
      temporalRange: string;
    };
    warnings: string[];
  };
  agbChange: {
    meanAGBChange: number;
    percentChange: number;
    totalBiomassChange: number;
    annualAGBChange: number;
    status: string;
    interpretation: string;
  };
  timePeriod: {
    startDate: string;
    endDate: string;
    durationDays: number;
    durationYears: number;
  };
  regressionModel: {
    equation: string;
    coefficients: any;
    unit: string;
    reference: string;
  };
  metadata: {
    resolution: string;
    dataSources: {
      optical: string;
      radar: string;
      lidar: string;
    };
    notes: string[];
  };
}

interface AGBResultsProps {
  data: AGBData;
}

export default function AGBResults({ data }: AGBResultsProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30">
        <h2 className="text-2xl font-bold text-white mb-4">📊 AGB Analysis Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Start Date"
            value={data.timePeriod.startDate}
            icon="📅"
          />
          <StatCard
            title="End Date"
            value={data.timePeriod.endDate}
            icon="📅"
          />
          <StatCard
            title="Duration"
            value={`${data.timePeriod.durationYears} years`}
            icon="⏱️"
          />
          <StatCard
            title="Area"
            value={`${data.startDate.agb.areaHa.toFixed(2)} ha`}
            icon="📏"
          />
        </div>
      </div>

      {/* AGB Change Overview */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30">
        <h3 className="text-xl font-semibold text-white mb-4">🌲 Biomass Change Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <ChangeCard
            label="AGB Change"
            value={`${data.agbChange.meanAGBChange > 0 ? '+' : ''}${data.agbChange.meanAGBChange.toFixed(2)} t/ha`}
            status={data.agbChange.status}
          />
          <ChangeCard
            label="Percent Change"
            value={`${data.agbChange.percentChange > 0 ? '+' : ''}${data.agbChange.percentChange.toFixed(2)}%`}
            status={data.agbChange.status}
          />
          <ChangeCard
            label="Annual Change"
            value={`${data.agbChange.annualAGBChange > 0 ? '+' : ''}${data.agbChange.annualAGBChange.toFixed(2)} t/ha/yr`}
            status={data.agbChange.status}
          />
        </div>
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-100">
            <strong>Interpretation:</strong> {data.agbChange.interpretation}
          </p>
        </div>
      </div>

      {/* Warnings */}
      {(data.startDate.warnings.length > 0 || data.endDate.warnings.length > 0) && (
        <div className="bg-yellow-500/10 backdrop-blur-sm rounded-xl p-6 border border-yellow-500/30">
          <h3 className="text-lg font-semibold text-yellow-200 mb-3">⚠️ Data Availability Notices</h3>
          {data.startDate.warnings.length > 0 && (
            <div className="mb-2">
              <p className="text-sm text-yellow-100 font-medium">Start Date:</p>
              {data.startDate.warnings.map((warning, i) => (
                <p key={i} className="text-xs text-yellow-100 ml-4">• {warning}</p>
              ))}
            </div>
          )}
          {data.endDate.warnings.length > 0 && (
            <div>
              <p className="text-sm text-yellow-100 font-medium">End Date:</p>
              {data.endDate.warnings.map((warning, i) => (
                <p key={i} className="text-xs text-yellow-100 ml-4">• {warning}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detailed AGB Data Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AGBDataCard
          title="Start Date AGB"
          data={data.startDate}
          color="blue"
        />
        <AGBDataCard
          title="End Date AGB"
          data={data.endDate}
          color="green"
        />
      </div>

      {/* Regression Model Info */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30">
        <h3 className="text-xl font-semibold text-white mb-4">🧮 Regression Model</h3>
        <div className="space-y-2 text-sm">
          <p className="text-blue-200">
            <strong>Equation:</strong> {data.regressionModel.equation}
          </p>
          <p className="text-blue-200">
            <strong>Unit:</strong> {data.regressionModel.unit}
          </p>
          <p className="text-blue-200">
            <strong>Reference:</strong> {data.regressionModel.reference}
          </p>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30">
        <h3 className="text-xl font-semibold text-white mb-4">ℹ️ Metadata</h3>
        <div className="space-y-2 text-sm">
          <p className="text-blue-200">
            <strong>Resolution:</strong> {data.metadata.resolution}
          </p>
          <p className="text-blue-200">
            <strong>Optical Data:</strong> {data.metadata.dataSources.optical}
          </p>
          <p className="text-blue-200">
            <strong>Radar Data:</strong> {data.metadata.dataSources.radar}
          </p>
          <p className="text-blue-200">
            <strong>LiDAR Data:</strong> {data.metadata.dataSources.lidar}
          </p>
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm font-semibold text-blue-200 mb-2">📝 Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-blue-100">
              {data.metadata.notes.map((note: string, i: number) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-blue-500/20">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <p className="text-sm text-blue-200">{title}</p>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function ChangeCard({ label, value, status }: { label: string; value: string; status: string }) {
  const statusColor = status === 'Increase' 
    ? 'border-green-500/30 bg-green-500/10' 
    : status === 'Decrease' 
    ? 'border-red-500/30 bg-red-500/10' 
    : 'border-gray-500/30 bg-gray-500/10';
  
  const textColor = status === 'Increase' 
    ? 'text-green-300' 
    : status === 'Decrease' 
    ? 'text-red-300' 
    : 'text-gray-300';

  return (
    <div className={`rounded-lg p-4 border ${statusColor}`}>
      <p className="text-sm text-blue-200 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}

function AGBDataCard({ title, data, color }: { 
  title: string; 
  data: AGBData['startDate'] | AGBData['endDate']; 
  color: 'blue' | 'green' 
}) {
  const borderColor = color === 'blue' ? 'border-blue-500/30' : 'border-green-500/30';
  const bgColor = color === 'blue' ? 'from-blue-900/20' : 'from-green-900/20';

  return (
    <div className={`bg-gradient-to-br ${bgColor} to-slate-800/50 backdrop-blur-sm rounded-xl p-6 border ${borderColor}`}>
      <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>

      {/* Data Range Used */}
      <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
        <p className="text-sm font-semibold text-blue-200 mb-2">📅 Data Range Used</p>
        <div className="space-y-1 text-xs text-blue-100">
          <p>Target: {data.targetDate}</p>
          <p>Actual: {data.actualDataRange.start} to {data.actualDataRange.end}</p>
        </div>
      </div>

      {/* AGB Values */}
      <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
        <p className="text-sm font-semibold text-blue-200 mb-2">🌲 AGB Values</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-100">
          <div>
            <p className="text-white font-semibold">Mean AGB</p>
            <p>{data.agb.meanAGB.toFixed(2)} t/ha</p>
          </div>
          <div>
            <p className="text-white font-semibold">Total Biomass</p>
            <p>{data.agb.totalBiomass.toFixed(2)} t</p>
          </div>
          <div>
            <p className="text-white font-semibold">Min AGB</p>
            <p>{data.agb.minAGB.toFixed(2)} t/ha</p>
          </div>
          <div>
            <p className="text-white font-semibold">Max AGB</p>
            <p>{data.agb.maxAGB.toFixed(2)} t/ha</p>
          </div>
        </div>
      </div>

      {/* Input Metrics */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-blue-200 mb-2">📊 Input Metrics</p>
        <div className="space-y-2">
          <MetricRow label="NDVI" value={data.inputMetrics.ndvi.mean.toFixed(3)} />
          <MetricRow label="EVI" value={data.inputMetrics.evi.mean.toFixed(3)} />
          <MetricRow label="LAI" value={data.inputMetrics.lai.mean.toFixed(2)} />
          <MetricRow label="VH" value={data.inputMetrics.vh.mean.toFixed(2)} />
          <MetricRow label="VV" value={data.inputMetrics.vv.mean.toFixed(2)} />
          <MetricRow label="RVI" value={data.inputMetrics.rvi.mean.toFixed(3)} />
          <MetricRow 
            label="Canopy Height" 
            value={data.inputMetrics.canopyHeight ? `${data.inputMetrics.canopyHeight.mean.toFixed(2)} m` : 'N/A'} 
          />
        </div>
      </div>

      {/* Data Quality */}
      <div className="p-3 bg-slate-700/30 rounded-lg">
        <p className="text-sm font-semibold text-blue-200 mb-2">📡 Data Quality</p>
        <div className="space-y-1 text-xs text-blue-100">
          <p>Sentinel-2 images: {data.dataQuality.sentinel2Images}</p>
          <p>Sentinel-1 images: {data.dataQuality.sentinel1Images}</p>
          <p>GEDI footprints: {data.dataQuality.gediFootprints}</p>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center p-2 bg-slate-700/30 rounded">
      <span className="text-xs text-white">{label}</span>
      <span className="text-xs font-semibold text-white">{value}</span>
    </div>
  );
}
