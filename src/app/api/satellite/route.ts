import { NextRequest, NextResponse } from 'next/server';
import ee from '@google/earthengine';
import { calculateEVI, calculateLAI, calculateNDVI, ensureInitialized, maskS2Clouds } from '@/lib/earthEngine';

/**
 * Multi-Sensor Satellite Data API
 * Fetches and processes:
 * - Sentinel-2: NDVI, EVI, LAI, True Color
 * - Sentinel-1: VV, VH, RVI
 * - GEDI: RH98 Canopy Height
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { geometry, startDate, endDate, cloudCoverMax = 20 } = body;

    if (!geometry || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: geometry, startDate, endDate' },
        { status: 400 }
      );
    }

    await ensureInitialized();
    const geom = ee.Geometry.Polygon(geometry.coordinates);

    console.log('🛰️ Fetching multi-sensor satellite data...');

    /* ========================================
     * 1️⃣ SENTINEL-2 PROCESSING
     * ======================================== */
    console.log('📡 Processing Sentinel-2 data...');
    const sentinel2 = new ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(geom)
      .filterDate(startDate, endDate)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloudCoverMax));

    const s2Processed = sentinel2
      .map(maskS2Clouds)
      .map(calculateNDVI)
      .map(calculateEVI)
      .map(calculateLAI);

    const s2Composite = s2Processed.median();

    /* ========================================
     * 2️⃣ SENTINEL-1 PROCESSING
     * ======================================== */
    console.log('📡 Processing Sentinel-1 SAR data...');
    const sentinel1 = new ee.ImageCollection('COPERNICUS/S1_GRD')
      .filterBounds(geom)
      .filterDate(startDate, endDate)
      .filter((ee as any).Filter.eq('instrumentMode', 'IW'))
      .filter((ee as any).Filter.listContains('transmitterReceiverPolarisation', 'VV'))
      .filter((ee as any).Filter.listContains('transmitterReceiverPolarisation', 'VH'))
      .select(['VV', 'VH']);

    const s1Median = sentinel1.median();

    // Calculate RVI (Radar Vegetation Index): 4 * VH / (VV + VH)
    const rvi = s1Median.expression(
      '4 * VH / (VV + VH)',
      {
        VV: s1Median.select('VV'),
        VH: s1Median.select('VH'),
      }
    ).rename('RVI');

    const s1Composite = s1Median.addBands(rvi);

    // Sentinel-1 visualization parameters
    const s1Visualizations = {
      vv: { bands: ['VV'], min: -25, max: 0, palette: ['black', 'white'] },
      vh: { bands: ['VH'], min: -30, max: 0, palette: ['black', 'white'] },
      rvi: { bands: ['RVI'], min: 0, max: 1, palette: ['black', 'yellow', 'green'] },
    };

    /* ========================================
     * 3️⃣ GEDI CANOPY HEIGHT
     * ======================================== */
    console.log('🌳 Processing GEDI canopy height data...');
    let gediComposite: any = null;
    let hasGEDI = false;

    try {
      const gediCollection = new ee.ImageCollection('LARSE/GEDI/GEDI02_A_002_MONTHLY')
        .filterBounds(geom)
        .filterDate(startDate, endDate)
        .select(['rh98']);

      const gediSize = await new Promise<number>((resolve, reject) => {
        (gediCollection as any).size().evaluate((size: number, error: any) => {
          if (error) reject(error);
          else resolve(size);
        });
      });

      if (gediSize > 0) {
        gediComposite = gediCollection.mean().rename('CanopyHeight');
        hasGEDI = true;
        console.log('✅ Found GEDI data');
      } else {
        console.warn('⚠️ No GEDI data available for this region/period');
      }
    } catch (error) {
      console.warn('⚠️ GEDI data unavailable:', error);
    }

    /* ========================================
     * 4️⃣ CALCULATE STATISTICS
     * ======================================== */
    console.log('📊 Computing statistics...');
    const reducer = ee.Reducer.mean().combine({
      reducer2: ee.Reducer.minMax(),
      sharedInputs: true,
    });

    let statsImage = s2Composite
      .select(['NDVI', 'EVI', 'LAI'])
      .addBands(s1Composite.select(['VV', 'VH', 'RVI']));

    if (hasGEDI && gediComposite) {
      statsImage = statsImage.addBands(gediComposite.select('CanopyHeight'));
    }

    const stats = await new Promise((resolve, reject) => {
      statsImage
        .reduceRegion({
          reducer,
          geometry: geom,
          scale: 10,
          maxPixels: 1e13,
        } as any)
        .evaluate((result: any, error: any) => {
          if (error) reject(error);
          else resolve(result);
        });
    });

    // Check collection sizes
    const [s2Count, s1Count] = await Promise.all([
      new Promise<number>((resolve, reject) => {
        (sentinel2 as any).size().evaluate((size: number, error: any) => {
          if (error) reject(error);
          else resolve(size);
        });
      }),
      new Promise<number>((resolve, reject) => {
        (sentinel1 as any).size().evaluate((size: number, error: any) => {
          if (error) reject(error);
          else resolve(size);
        });
      }),
    ]);

    /* ========================================
     * 6️⃣ BUILD RESPONSE
     * ======================================== */
    const warnings = [];
    if (!hasGEDI) {
      warnings.push('GEDI canopy height data not available for this region/time period');
    }
    if (s2Count === 0) {
      warnings.push('No Sentinel-2 imagery found in date range');
    }
    if (s1Count === 0) {
      warnings.push('No Sentinel-1 imagery found in date range');
    }

    console.log('✅ Multi-sensor data processing complete');

    return NextResponse.json({
      success: true,
      data: {
        statistics: stats,
        dataQuality: {
          sentinel2Images: s2Count,
          sentinel1Images: s1Count,
          gediAvailable: hasGEDI,
        },
        dateRange: { startDate, endDate },
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    });
  } catch (error: any) {
    console.error('❌ Error processing satellite data:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to process satellite data',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
