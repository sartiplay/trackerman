// API route for managing skins

import { NextRequest, NextResponse } from 'next/server';
import { TrackermanService } from '../../../lib/trackerman-service';
import { Logger } from '../../../lib/logger';

let trackermanService: TrackermanService | null = null;

async function getTrackermanService(): Promise<TrackermanService> {
  if (!trackermanService) {
    trackermanService = new TrackermanService();
    await trackermanService.initialize();
  }
  return trackermanService;
}

// GET /api/skins - Get all tracked skins
export async function GET() {
  try {
    const service = await getTrackermanService();
    const skins = service.getSkins();
    
    Logger.info('API GET /api/skins');
    return NextResponse.json({ success: true, data: skins });
  } catch (error) {
    Logger.error('API GET /api/skins failed', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch skins' },
      { status: 500 }
    );
  }
}

// POST /api/skins - Add new skin to track
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, thresholds, exteriorOverride } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    const service = await getTrackermanService();
    Logger.info('API POST /api/skins', { url });
    await service.addSkin(url, thresholds, exteriorOverride);
    
    return NextResponse.json({ success: true, message: 'Skin added successfully' });
  } catch (error) {
    Logger.error('API POST /api/skins failed', error);
    console.error('Detailed error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to add skin' },
      { status: 400 }
    );
  }
}

// DELETE /api/skins - Remove skin from tracking
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const exterior = searchParams.get('exterior');

    if (!name || !exterior) {
      return NextResponse.json(
        { success: false, error: 'Name and exterior are required' },
        { status: 400 }
      );
    }

    const service = await getTrackermanService();
    Logger.info('API DELETE /api/skins', { name, exterior });
    await service.removeSkin(name, exterior);
    
    return NextResponse.json({ success: true, message: 'Skin removed successfully' });
  } catch (error) {
    Logger.error('API DELETE /api/skins failed', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to remove skin' },
      { status: 400 }
    );
  }
}

// PUT /api/skins - Update skin thresholds
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, exterior, thresholds } = body;

    if (!name || !exterior) {
      return NextResponse.json(
        { success: false, error: 'Name and exterior are required' },
        { status: 400 }
      );
    }

    const service = await getTrackermanService();
    Logger.info('API PUT /api/skins', { name, exterior });
    await service.updateSkinThresholds(name, exterior, thresholds);
    
    return NextResponse.json({ success: true, message: 'Skin thresholds updated successfully' });
  } catch (error) {
    Logger.error('API PUT /api/skins failed', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update skin thresholds' },
      { status: 400 }
    );
  }
}
