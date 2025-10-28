# Trackerman - CS2 Steam Market Item Tracker

Trackerman is a self-hosted web application for tracking Counter-Strike 2 Steam market items with automated price monitoring and Discord notifications.

## Features

- **Item Tracking**: Add Steam market URLs to track specific CS2 items
- **Automated Fetching**: Auto-scheduler with configurable intervals
- **Price History**: Store and view price history for all tracked items
- **Discord Notifications**: Get notified of price changes and threshold hits
- **Threshold Monitoring**: Set high/low price thresholds for alerts
- **Rate Limiting**: Configurable delays and timeouts to respect Steam's rate limits
- **Clean UI**: Modern, responsive interface built with Next.js and Tailwind CSS

## Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Adding Items to Track

1. Go to the Steam Community Market
2. Search for the CS2 item you want to track
3. Copy the URL (e.g., `https://steamcommunity.com/market/search?appid=730&q=karambit+fade`)
4. Paste the URL in the "Add New Skin to Track" field
5. Click "Add Skin"

### Setting Up Discord Notifications

1. Create a Discord webhook in your server:
   - Go to Server Settings → Integrations → Webhooks
   - Create a new webhook and copy the URL
2. In Trackerman settings:
   - Enable Discord notifications
   - Paste your webhook URL
   - Choose which notifications you want (price updates, threshold alerts)
3. Test the webhook to ensure it's working

### Configuring Auto-Scheduler

1. Go to Settings
2. Enable Auto Scheduler
3. Set the interval (in minutes) for automatic data fetching
4. The scheduler will automatically fetch data for all tracked items

### Setting Price Thresholds

1. Add thresholds when adding a skin, or
2. Use the API to update thresholds for existing skins

## API Endpoints

### Skins Management
- `GET /api/skins` - Get all tracked skins
- `POST /api/skins` - Add new skin to track
- `DELETE /api/skins?name={name}&exterior={exterior}` - Remove skin
- `PUT /api/skins` - Update skin thresholds

### Data Fetching
- `POST /api/fetch` - Manually fetch data
- `GET /api/fetch/scheduler` - Get scheduler status
- `PUT /api/fetch/trigger` - Manually trigger scheduler

### Settings
- `GET /api/settings` - Get current settings
- `PUT /api/settings` - Update settings
- `POST /api/settings/test-discord` - Test Discord webhook

## Data Storage

- **Skins Data**: Stored in `/data/data.json`
- **Settings**: Stored in `/settings.json` (root directory)

## Configuration

### Scraping Settings
- **Timeout**: Request timeout in milliseconds (default: 10000ms)
- **Delay Between Requests**: Delay between scraping requests (default: 1000ms)
- **Max Retries**: Maximum retry attempts for failed requests (default: 3)

### Auto Scheduler
- **Interval**: How often to fetch data (minimum: 1 minute)
- **Enabled**: Toggle automatic data fetching

### Discord Notifications
- **Enabled**: Toggle Discord notifications
- **Webhook URL**: Discord webhook URL
- **Price Updates**: Notify on price changes
- **Threshold High**: Notify when price hits high threshold
- **Threshold Low**: Notify when price hits low threshold

## Supported Steam URLs

Trackerman supports Steam Community Market search URLs in the format:
```
https://steamcommunity.com/market/search?appid=730&q={item_name}
```

Examples:
- `https://steamcommunity.com/market/search?appid=730&q=karambit+fade`
- `https://steamcommunity.com/market/search?appid=730&q=p90+asiimov`
- `https://steamcommunity.com/market/search?appid=730&q=p250+see+ya+later+factory+new`

## Exterior Detection

Trackerman automatically detects item exteriors from URLs and item names:
- Factory New
- Minimal Wear
- Field-Tested
- Well-Worn
- Battle-Scarred

## Development

### Project Structure
```
trackerman/
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── page.tsx        # Main dashboard
│   └── layout.tsx      # App layout
├── components/         # React components
├── lib/                # Core functionality
│   ├── data-manager.ts # Data persistence
│   ├── steam-scraper.ts # Steam market scraping
│   ├── discord-notifier.ts # Discord notifications
│   ├── auto-scheduler.ts # Automated scheduling
│   └── trackerman-service.ts # Main service
├── types/              # TypeScript type definitions
├── data/               # Data storage
└── settings.json       # Application settings
```

### Building for Production

```bash
pnpm build
pnpm start
```

## License

This project is for personal use. Please respect Steam's terms of service and rate limits when using this application.

## Disclaimer

This application is not affiliated with Valve or Steam. Use at your own risk and ensure compliance with Steam's terms of service.