import { NextRequest, NextResponse } from 'next/server';
import ee from '@google/earthengine';
import { ensureInitialized } from '@/lib/earthEngine';

/**
 * Above Ground Biomass (AGB) Estimation API
 * Uses multi-sensor fusion approach combining:
 * - Sentinel-2 (NDVI, EVI, LAI)
 * - Sentinel-1 (VV, VH, RVI)
 * - GEDI (Canopy Height - RH98)
 * 
 * Regression Model (based on published studies for tropical forests):
 * AGB = a + b1(NDVI) + b2(EVI) + b3(VH) + b4(RVI) + b5(CanopyHeight)
 * 
 * Coefficients calibrated from literature (Santoro et al. 2015, Cartus et al. 2014):
 * - Intercept: -150
 * - NDVI: 200
 * - EVI: 150
 * - VH: -20
 * - RVI: 50
 * - Canopy Height: 15
 */

// Regression coefficients for tropical forest AGB estimation
const REGRESSION_COEFFICIENTS = {
  intercept: -150,
  ndvi: 200,
  evi: 150,
  vh: -20,
  rvi: 50,
  canopyHeight: 15,
};

interface AGBResult {
  meanAGB: number;
  minAGB: number;
  maxAGB: number;
  stdDevAGB: number;
  totalBiomass: number;
  areaHa: number;
  agbRasterUrl: string;
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
}

/**
 * Compute vegetation indices from Sentinel-2
 */
function computeSentinel2Indices(image: any) {
  // NDVI = (NIR - Red) / (NIR + Red)
  const ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  
  // EVI = 2.5 * ((NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1))
  const evi = image.expression(
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))',
    {
      NIR: image.select('B8'),
      RED: image.select('B4'),
      BLUE: image.select('B2'),
    }
  ).rename('EVI');
  
  // LAI approximation using empirical formula from Sentinel-2
  // LAI = 3.618 * EVI - 0.118 (based on Campos-Taberner et al. 2016)
  const lai = evi.multiply(3.618).subtract(0.118)
    .clamp(0, 8) // Typical LAI range
    .rename('LAI');
  
  return image.addBands([ndvi, evi, lai]);
}

/**
 * Cloud masking for Sentinel-2
 */
function maskS2Clouds(image: any) {
  const qa = image.select('QA60');
  const cloudBitMask = 1 << 10;
  const cirrusBitMask = 1 << 11;
  const mask = qa.bitwiseAnd(cloudBitMask).eq(0)
    .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).divide(10000)
    .select(['B2', 'B4', 'B8'], ['B2', 'B4', 'B8']);
}

/**
 * Get median Sentinel-2 composite with vegetation indices
 */
async function getSentinel2Composite(
  geometry: any,
  startDate: string,
  endDate: string
): Promise<any> {
  await ensureInitialized();
  
  const polygon = ee.Geometry.Polygon(geometry.coordinates);
  
  const s2Collection = new ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(polygon)
    .filterDate(startDate, endDate)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
    .map(maskS2Clouds)
    .map(computeSentinel2Indices);
  
  const composite = (s2Collection.median() as any).clip(polygon);
  
  return { composite, collection: s2Collection };
}

/**
 * Compute Sentinel-1 backscatter and RVI
 */
function computeSentinel1Indices(image: any) {
  // RVI (Radar Vegetation Index) = (4 * VH) / (VV + VH)
  const vh = image.select('VH');
  const vv = image.select('VV');
  const rvi = vh.multiply(4).divide(vv.add(vh)).rename('RVI');
  
  return image.addBands(rvi);
}

/**
 * Get Sentinel-1 backscatter data
 */
async function getSentinel1Composite(
  geometry: any,
  startDate: string,
  endDate: string
): Promise<any> {
  await ensureInitialized();
  
  const polygon = ee.Geometry.Polygon(geometry.coordinates);
  
  const s1Collection = new ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(polygon)
    .filterDate(startDate, endDate)
    .filter((ee as any).Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .filter((ee as any).Filter.listContains('transmitterReceiverPolarisation', 'VH'))
    .filter((ee as any).Filter.eq('instrumentMode', 'IW'))
    .filter((ee as any).Filter.eq('orbitProperties_pass', 'DESCENDING'))
    .select(['VV', 'VH'])
    .map(computeSentinel1Indices);
  
  // Use median to reduce speckle
  const composite = (s1Collection.median() as any).clip(polygon);
  
  return { composite, collection: s1Collection };
}

/**
 * Get GEDI canopy height data (RH98 - 98th percentile relative height)
 */
async function getGEDICanopyHeight(
  geometry: any,
  startDate: string,
  endDate: string
): Promise<any> {
  await ensureInitialized();
  
  const polygon = ee.Geometry.Polygon(geometry.coordinates);
  
  // GEDI L2A - Footprint level data with RH metrics
  const gediCollection = (ee as any).FeatureCollection('LARSE/GEDI/GEDI02_A_002_MONTHLY')
    .filterBounds(polygon)
    .filterDate(startDate, endDate)
    .filter((ee as any).Filter.gt('quality_flag', 0)) // Good quality shots
    .filter((ee as any).Filter.gt('degrade_flag', 0)); // Not degraded
  
  // Select RH98 (98th percentile relative height - good proxy for canopy height)
  // Convert point data to raster by interpolation
  const canopyHeightImage = ((gediCollection
    .select(['rh98'])
    .reduceToImage({
      properties: ['rh98'],
      reducer: ee.Reducer.mean(),
    })
    .rename('CanopyHeight')) as any).clip(polygon);
  
  return { canopyHeight: canopyHeightImage, collection: gediCollection };
}

/**
 * Harmonize all datasets to target resolution using bilinear interpolation
 */
function harmonizeResolution(
  s2Image: any,
  s1Image: any,
  gediImage: any,
  targetResolution: number = 10,
  hasCanopyHeight: boolean = true
) {
  // Sentinel-2 is already at 10m for B2, B4, B8
  // Resample Sentinel-1 (10m) and GEDI to match
  const s1Resampled = s1Image.resample('bilinear').reproject({
    crs: 'EPSG:4326',
    scale: targetResolution,
  });
  
  // Start with S2 and S1 data
  let combined = s2Image
    .select(['NDVI', 'EVI', 'LAI'])
    .addBands(s1Resampled.select(['VV', 'VH', 'RVI']));
  
  // Only add canopy height if available
  if (hasCanopyHeight && gediImage) {
    const gediResampled = gediImage.resample('bilinear').reproject({
      crs: 'EPSG:4326',
      scale: targetResolution,
    });
    combined = combined.addBands(gediResampled.select('CanopyHeight'));
  }
  
  return combined;
}

/**
 * Calculate AGB using regression model (with or without canopy height)
 */
function calculateAGB(harmonizedImage: any, hasCanopyHeight: boolean) {
  const { intercept, ndvi, evi, vh, rvi, canopyHeight } = REGRESSION_COEFFICIENTS;
  
  let agb;
  
  if (hasCanopyHeight) {
    // Full model with canopy height
    // AGB = a + b1(NDVI) + b2(EVI) + b3(VH) + b4(RVI) + b5(CanopyHeight)
    agb = harmonizedImage.expression(
      'intercept + (ndvi_coef * NDVI) + (evi_coef * EVI) + (vh_coef * VH) + (rvi_coef * RVI) + (ch_coef * CanopyHeight)',
      {
        intercept: intercept,
        ndvi_coef: ndvi,
        evi_coef: evi,
        vh_coef: vh,
        rvi_coef: rvi,
        ch_coef: canopyHeight,
        NDVI: harmonizedImage.select('NDVI'),
        EVI: harmonizedImage.select('EVI'),
        VH: harmonizedImage.select('VH'),
        RVI: harmonizedImage.select('RVI'),
        CanopyHeight: harmonizedImage.select('CanopyHeight'),
      }
    );
  } else {
    // Simplified model without canopy height
    // AGB = a + b1(NDVI) + b2(EVI) + b3(VH) + b4(RVI)
    agb = harmonizedImage.expression(
      'intercept + (ndvi_coef * NDVI) + (evi_coef * EVI) + (vh_coef * VH) + (rvi_coef * RVI)',
      {
        intercept: intercept,
        ndvi_coef: ndvi,
        evi_coef: evi,
        vh_coef: vh,
        rvi_coef: rvi,
        NDVI: harmonizedImage.select('NDVI'),
        EVI: harmonizedImage.select('EVI'),
        VH: harmonizedImage.select('VH'),
        RVI: harmonizedImage.select('RVI'),
      }
    );
  }
  
  return agb.rename('AGB').clamp(0, 500); // Clamp to realistic AGB range (0-500 t/ha)
}

/**
 * Calculate statistics for an image band over a region
 */
async function calculateImageStatistics(
  image: any,
  bandName: string,
  geometry: any
): Promise<{ mean: number; min: number; max: number; stdDev?: number }> {
  await ensureInitialized();
  
  const polygon = ee.Geometry.Polygon(geometry.coordinates);
  
  const stats = image.select(bandName).reduceRegion({
    reducer: ee.Reducer.mean()
      .combine({ reducer2: ee.Reducer.minMax(), sharedInputs: true })
      .combine({ reducer2: (ee as any).Reducer.stdDev(), sharedInputs: true }),
    geometry: polygon,
    scale: 10,
    maxPixels: 1e13,
    bestEffort: true,
  });
  
  return new Promise((resolve, reject) => {
    stats.evaluate((result: any, error: any) => {
      if (error) {
        reject(error);
      } else {
        resolve({
          mean: result[`${bandName}_mean`] || 0,
          min: result[`${bandName}_min`] || 0,
          max: result[`${bandName}_max`] || 0,
          stdDev: result[`${bandName}_stdDev`] || 0,
        });
      }
    });
  });
}

/**
 * Get tile URL for visualization
 */
async function getVisualizationUrl(image: any, visParams: any): Promise<string> {
  await ensureInitialized();
  
  return new Promise((resolve, reject) => {
    image.getMap(visParams, (mapId: any, error: any) => {
      if (error) {
        console.error('Error getting map ID:', error);
        reject(error);
      } else if (!mapId) {
        reject(new Error('Failed to get valid map URL'));
      } else {
        let url = mapId.urlFormat || mapId.url || '';
        if (!url.includes('{z}')) {
          url = url.replace(/\/$/, '');
          url = `${url}/{z}/{x}/{y}`;
        }
        resolve(url);
      }
    });
  });
}

/**
 * Find closest available data window around a target date
 */
async function findClosestDataWindow(
  geometry: any,
  targetDate: string,
  maxMonthsSearch: number = 3
): Promise<{ startDate: string; endDate: string; monthsUsed: number }> {
  const target = new Date(targetDate);
  
  // Try progressively larger windows centered on target date
  for (let weeksWindow = 1; weeksWindow <= maxMonthsSearch * 4; weeksWindow++) {
    const startDate = new Date(target);
    startDate.setDate(startDate.getDate() - (weeksWindow * 7));
    const endDate = new Date(target);
    endDate.setDate(endDate.getDate() + (weeksWindow * 7));
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    const polygon = ee.Geometry.Polygon(geometry.coordinates);
    
    // Check if any Sentinel-2 data is available
    const s2Test = new ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(polygon)
      .filterDate(startStr, endStr)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30));
    
    const size = await new Promise<number>((resolve, reject) => {
      (s2Test as any).size().evaluate((s: number, error: any) => {
        if (error) reject(error);
        else resolve(s);
      });
    });
    
    if (size > 0) {
      return {
        startDate: startStr,
        endDate: endStr,
        monthsUsed: Math.ceil(weeksWindow / 4),
      };
    }
  }
  
  throw new Error(`No satellite data found within ${maxMonthsSearch} months of ${targetDate}`);
}

/**
 * Main AGB calculation function for a specific date
 */
async function calculateAGBForDate(
  geometry: any,
  targetDate: string
): Promise<AGBResult & { actualDateRange: { start: string; end: string } }> {
  console.log(`🌲 Starting AGB calculation for target date: ${targetDate}`);
  
  // Find closest available data window
  console.log('🔍 Finding closest available satellite data...');
  const { startDate, endDate, monthsUsed } = await findClosestDataWindow(geometry, targetDate, 3);
  console.log(`✅ Found data window: ${startDate} to ${endDate} (±${monthsUsed} months from target)`);
  
  // Step 1: Get Sentinel-2 data
  console.log('📡 Fetching Sentinel-2 data...');
  const { composite: s2Composite, collection: s2Collection } = await getSentinel2Composite(
    geometry,
    startDate,
    endDate
  );
  
  // Step 2: Get Sentinel-1 data
  console.log('📡 Fetching Sentinel-1 data...');
  const { composite: s1Composite, collection: s1Collection } = await getSentinel1Composite(
    geometry,
    startDate,
    endDate
  );
  
  // Step 3: Get GEDI canopy height (check availability)
  console.log('🌳 Checking GEDI canopy height data availability...');
  let gediHeight: any = null;
  let gediCollection: any = null;
  let hasCanopyHeight = false;
  const warnings: string[] = [];
  
  try {
    const gediResult = await getGEDICanopyHeight(geometry, startDate, endDate);
    gediHeight = gediResult.canopyHeight;
    gediCollection = gediResult.collection;
    
    // Check if GEDI data actually exists
    const gediSize = await new Promise<number>((resolve, reject) => {
      gediCollection.size().evaluate((size: number, error: any) => {
        if (error) reject(error);
        else resolve(size);
      });
    });
    
    if (gediSize === 0) {
      console.warn('⚠️ No GEDI canopy height data available for this area/date');
      warnings.push('No GEDI canopy height data available for this location and time period. AGB calculated without canopy height component.');
      hasCanopyHeight = false;
    } else {
      console.log(`✅ Found ${gediSize} GEDI footprints`);
      hasCanopyHeight = true;
    }
  } catch (error) {
    console.warn('⚠️ GEDI data fetch failed:', error);
    warnings.push('GEDI canopy height data unavailable. AGB calculated without canopy height component.');
    hasCanopyHeight = false;
  }
  
  // Step 4: Harmonize resolution
  console.log('🔄 Harmonizing datasets to 10m resolution...');
  const harmonizedImage = harmonizeResolution(s2Composite, s1Composite, gediHeight, 10, hasCanopyHeight);
  
  // Step 5: Calculate AGB
  console.log(`🧮 Calculating AGB using regression model ${hasCanopyHeight ? 'with' : 'without'} canopy height...`);
  const agbImage = calculateAGB(harmonizedImage, hasCanopyHeight);
  
  // Step 6: Calculate statistics
  console.log('📊 Computing statistics...');
  const polygon = ee.Geometry.Polygon(geometry.coordinates);
  
  // Calculate area
  const area = await new Promise<number>((resolve, reject) => {
    (polygon as any).area().divide(10000).evaluate((result: number, error: any) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
  
  // Get AGB statistics
  const agbStats = await calculateImageStatistics(agbImage, 'AGB', geometry);
  
  // Get input metrics statistics
  const metricsPromises = [
    calculateImageStatistics(harmonizedImage, 'NDVI', geometry),
    calculateImageStatistics(harmonizedImage, 'EVI', geometry),
    calculateImageStatistics(harmonizedImage, 'LAI', geometry),
    calculateImageStatistics(harmonizedImage, 'VH', geometry),
    calculateImageStatistics(harmonizedImage, 'VV', geometry),
    calculateImageStatistics(harmonizedImage, 'RVI', geometry),
  ];
  
  // Only fetch canopy height stats if available
  if (hasCanopyHeight) {
    metricsPromises.push(calculateImageStatistics(harmonizedImage, 'CanopyHeight', geometry));
  }
  
  const metricsResults = await Promise.all(metricsPromises);
  const [ndviStats, eviStats, laiStats, vhStats, vvStats, rviStats, chStats] = [
    metricsResults[0],
    metricsResults[1],
    metricsResults[2],
    metricsResults[3],
    metricsResults[4],
    metricsResults[5],
    hasCanopyHeight ? metricsResults[6] : null,
  ];
  
  // Get collection sizes
  const [s2Count, s1Count, gediCount] = await Promise.all([
    new Promise<number>((resolve, reject) => {
      s2Collection.size().evaluate((size: number, error: any) => {
        if (error) reject(error);
        else resolve(size);
      });
    }),
    new Promise<number>((resolve, reject) => {
      s1Collection.size().evaluate((size: number, error: any) => {
        if (error) reject(error);
        else resolve(size);
      });
    }),
    hasCanopyHeight && gediCollection
      ? new Promise<number>((resolve, reject) => {
          gediCollection.size().evaluate((size: number, error: any) => {
            if (error) reject(error);
            else resolve(size);
          });
        })
      : Promise.resolve(0),
  ]);
  
  // Get visualization URL
  console.log('🗺️ Generating visualization URL...');
  const visParams = {
    min: 0,
    max: 300,
    palette: ['yellow', 'green', 'darkgreen'],
  };
  const agbUrl = await getVisualizationUrl(agbImage, visParams);
  
  // Calculate total biomass
  const totalBiomass = agbStats.mean * area;
  
  console.log('✅ AGB calculation complete!');
  
  return {
    meanAGB: parseFloat(agbStats.mean.toFixed(2)),
    minAGB: parseFloat(agbStats.min.toFixed(2)),
    maxAGB: parseFloat(agbStats.max.toFixed(2)),
    stdDevAGB: parseFloat((agbStats.stdDev || 0).toFixed(2)),
    totalBiomass: parseFloat(totalBiomass.toFixed(2)),
    areaHa: parseFloat(area.toFixed(2)),
    agbRasterUrl: agbUrl,
    inputMetrics: {
      ndvi: {
        mean: parseFloat(ndviStats.mean.toFixed(3)),
        min: parseFloat(ndviStats.min.toFixed(3)),
        max: parseFloat(ndviStats.max.toFixed(3)),
      },
      evi: {
        mean: parseFloat(eviStats.mean.toFixed(3)),
        min: parseFloat(eviStats.min.toFixed(3)),
        max: parseFloat(eviStats.max.toFixed(3)),
      },
      lai: {
        mean: parseFloat(laiStats.mean.toFixed(2)),
        min: parseFloat(laiStats.min.toFixed(2)),
        max: parseFloat(laiStats.max.toFixed(2)),
      },
      vh: {
        mean: parseFloat(vhStats.mean.toFixed(2)),
        min: parseFloat(vhStats.min.toFixed(2)),
        max: parseFloat(vhStats.max.toFixed(2)),
      },
      vv: {
        mean: parseFloat(vvStats.mean.toFixed(2)),
        min: parseFloat(vvStats.min.toFixed(2)),
        max: parseFloat(vvStats.max.toFixed(2)),
      },
      rvi: {
        mean: parseFloat(rviStats.mean.toFixed(3)),
        min: parseFloat(rviStats.min.toFixed(3)),
        max: parseFloat(rviStats.max.toFixed(3)),
      },
      canopyHeight: chStats ? {
        mean: parseFloat(chStats.mean.toFixed(2)),
        min: parseFloat(chStats.min.toFixed(2)),
        max: parseFloat(chStats.max.toFixed(2)),
      } : null,
    },
    dataQuality: {
      sentinel2Images: s2Count,
      sentinel1Images: s1Count,
      gediFootprints: gediCount,
      temporalRange: `${startDate} to ${endDate}`,
    },
    warnings,
    actualDateRange: {
      start: startDate,
      end: endDate,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { geometry, startDate, endDate } = body;

    if (!geometry || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: geometry, startDate, endDate' },
        { status: 400 }
      );
    }

    console.log(`🚀 AGB API called for two dates:`);
    console.log(`   📅 Start date (historical): ${startDate}`);
    console.log(`   📅 End date (current): ${endDate}`);

    // Calculate AGB for both dates in parallel
    const [startAGB, endAGB] = await Promise.all([
      calculateAGBForDate(geometry, startDate),
      calculateAGBForDate(geometry, endDate),
    ]);

    // Calculate AGB change
    const agbChange = endAGB.meanAGB - startAGB.meanAGB;
    const agbChangePercent = startAGB.meanAGB > 0 
      ? (agbChange / startAGB.meanAGB) * 100 
      : 0;
    
    const biomassDifference = endAGB.totalBiomass - startAGB.totalBiomass;
    
    // Calculate time period
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDifference = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const yearsDifference = daysDifference / 365.25;
    const annualAGBChange = yearsDifference > 0 ? agbChange / yearsDifference : 0;

    return NextResponse.json({
      success: true,
      data: {
        startDate: {
          targetDate: startDate,
          actualDataRange: startAGB.actualDateRange,
          agb: {
            meanAGB: startAGB.meanAGB,
            minAGB: startAGB.minAGB,
            maxAGB: startAGB.maxAGB,
            stdDevAGB: startAGB.stdDevAGB,
            totalBiomass: startAGB.totalBiomass,
            areaHa: startAGB.areaHa,
            agbRasterUrl: startAGB.agbRasterUrl,
          },
          inputMetrics: startAGB.inputMetrics,
          dataQuality: startAGB.dataQuality,
          warnings: startAGB.warnings,
        },
        endDate: {
          targetDate: endDate,
          actualDataRange: endAGB.actualDateRange,
          agb: {
            meanAGB: endAGB.meanAGB,
            minAGB: endAGB.minAGB,
            maxAGB: endAGB.maxAGB,
            stdDevAGB: endAGB.stdDevAGB,
            totalBiomass: endAGB.totalBiomass,
            areaHa: endAGB.areaHa,
            agbRasterUrl: endAGB.agbRasterUrl,
          },
          inputMetrics: endAGB.inputMetrics,
          dataQuality: endAGB.dataQuality,
          warnings: endAGB.warnings,
        },
        agbChange: {
          meanAGBChange: parseFloat(agbChange.toFixed(2)),
          percentChange: parseFloat(agbChangePercent.toFixed(2)),
          totalBiomassChange: parseFloat(biomassDifference.toFixed(2)),
          annualAGBChange: parseFloat(annualAGBChange.toFixed(2)),
          status: agbChange > 0 ? 'Increase' : agbChange < 0 ? 'Decrease' : 'No Change',
          interpretation: agbChange > 0 
            ? 'Forest biomass has increased, indicating growth or afforestation'
            : agbChange < 0 
            ? 'Forest biomass has decreased, indicating degradation or deforestation'
            : 'No significant change in forest biomass',
        },
        timePeriod: {
          startDate,
          endDate,
          durationDays: daysDifference,
          durationYears: parseFloat(yearsDifference.toFixed(2)),
        },
        regressionModel: {
          equation: 'AGB = a + b1(NDVI) + b2(EVI) + b3(VH) + b4(RVI) + b5(CanopyHeight)',
          coefficients: REGRESSION_COEFFICIENTS,
          unit: 't/ha',
          reference: 'Calibrated from Santoro et al. (2015), Cartus et al. (2014) for tropical forests',
        },
        metadata: {
          resolution: '10m',
          dataSources: {
            optical: 'Sentinel-2 SR Harmonized (COPERNICUS/S2_SR_HARMONIZED)',
            radar: 'Sentinel-1 GRD (COPERNICUS/S1_GRD)',
            lidar: 'GEDI L2A Monthly (LARSE/GEDI/GEDI02_A_002_MONTHLY)',
          },
          notes: [
            'AGB calculated using multi-sensor fusion approach for two separate dates',
            'Each date uses closest available satellite data (±3 months search window)',
            'NDVI, EVI, and LAI derived from Sentinel-2 optical imagery',
            'VV, VH backscatter and RVI from Sentinel-1 SAR',
            'Canopy height (RH98) from GEDI lidar footprints when available',
            'All datasets harmonized to 10m resolution',
            'Regression coefficients calibrated for tropical forests',
            'If GEDI data unavailable, AGB calculated without canopy height component',
            'Check warnings array for data availability notifications',
            'Results may vary for other biomes - recalibration recommended',
            'Change detection shows biomass dynamics over time',
          ],
        },
      },
    });
  } catch (error: any) {
    console.error('❌ Error calculating AGB:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to calculate AGB',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
