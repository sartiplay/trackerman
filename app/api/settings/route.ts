// API route for settings management

import { NextRequest, NextResponse } from 'next/server';
import { TrackermanService } from '../../../lib/trackerman-service';
import { Logger } from '../../../lib/logger';
import { TrackermanSettings } from '../../../types';

let trackermanService: TrackermanService | null = null;

async function getTrackermanService(): Promise<TrackermanService> {
  if (!trackermanService) {
    trackermanService = new TrackermanService();
    await trackermanService.initialize();
  }
  return trackermanService;
}

// GET /api/settings - Get current settings
export async function GET() {
  try {
    const service = await getTrackermanService();
    const settings = service.getSettings();
    Logger.info('API GET /api/settings');
    
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const settings: Partial<TrackermanSettings> = body;

    const service = await getTrackermanService();
    await service.updateSettings(settings);
    Logger.info('API PUT /api/settings');
    
    return NextResponse.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 400 }
    );
  }
}

// POST /api/settings/test-discord - Test Discord webhook
export async function POST(request: NextRequest) {
  try {
    const service = await getTrackermanService();
    const success = await service.testDiscordWebhook();
    Logger.info('API POST /api/settings (test-discord)');
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Discord webhook test successful' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Discord webhook test failed' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error testing Discord webhook:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to test Discord webhook' },
      { status: 400 }
    );
  }
}
