// API route for scheduler status

import { NextResponse } from 'next/server';
import { TrackermanService } from '../../../../lib/trackerman-service';

let trackermanService: TrackermanService | null = null;

async function getTrackermanService(): Promise<TrackermanService> {
  if (!trackermanService) {
    trackermanService = new TrackermanService();
    await trackermanService.initialize();
  }
  return trackermanService;
}

// GET /api/fetch/scheduler - Get scheduler status
export async function GET() {
  try {
    const service = await getTrackermanService();
    const status = service.getSchedulerStatus();
    
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    console.error('Error fetching scheduler status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scheduler status' },
      { status: 500 }
    );
  }
}
