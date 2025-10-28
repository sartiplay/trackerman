// API route for fetching data

import { NextRequest, NextResponse } from 'next/server';
import { TrackermanService } from '../../../lib/trackerman-service';
import { ScrapingOptions } from '../../../types';
import { Logger } from '../../../lib/logger';

let trackermanService: TrackermanService | null = null;

async function getTrackermanService(): Promise<TrackermanService> {
  if (!trackermanService) {
    trackermanService = new TrackermanService();
    await trackermanService.initialize();
  }
  return trackermanService;
}

// POST /api/fetch - Fetch data for skins
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      fetchType = 'all', 
      priceType = 'lowest', 
      count = 1,
      selectedSkins = [],
      exteriorFilter = '',
      skinName,
      skinExterior
    } = body;

    const options: ScrapingOptions = {
      fetchType,
      priceType,
      count,
      selectedSkins,
      exteriorFilter
    };

    const service = await getTrackermanService();
    Logger.info('API POST /api/fetch', { fetchType, priceType, count, exteriorFilter });
    let results;

    if (fetchType === 'single' && skinName && skinExterior) {
      // Fetch data for a single skin
      results = await service.fetchSkinData(skinName, skinExterior, options);
    } else {
      // Fetch data for all skins
      results = await service.fetchAllSkinsData(options);
    }
    
    return NextResponse.json({ 
      success: true, 
      data: results,
      message: 'Data fetched successfully' 
    });
  } catch (error) {
    Logger.error('API POST /api/fetch failed', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch data' },
      { status: 400 }
    );
  }
}

// PUT /api/fetch/trigger - Manually trigger scheduler
export async function PUT(request: NextRequest) {
  try {
    const service = await getTrackermanService();
    Logger.info('API PUT /api/fetch/trigger');
    await service.manualTriggerScheduler();
    
    return NextResponse.json({ success: true, message: 'Scheduler triggered successfully' });
  } catch (error) {
    console.error('Error triggering scheduler:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to trigger scheduler' },
      { status: 400 }
    );
  }
}
