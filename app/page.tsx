'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Settings, Play, Pause, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Skin, TrackermanSettings, ScrapingOptions } from '@/types/index';
import toast, { Toaster } from 'react-hot-toast';

export default function Dashboard() {
  const [skins, setSkins] = useState<Skin[]>([]);
  const [settings, setSettings] = useState<TrackermanSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [newSkinUrl, setNewSkinUrl] = useState('');
  const [newSkinExterior, setNewSkinExterior] = useState('' as '' | 'Factory New' | 'Minimal Wear' | 'Field-Tested' | 'Well-Worn' | 'Battle-Scarred' | 'Unknown');
  const [showSettings, setShowSettings] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);
  const [fetchOptions, setFetchOptions] = useState({
    priceType: 'lowest' as 'lowest' | 'highest',
    count: 1,
    exteriorFilter: '' as '' | 'Factory New' | 'Minimal Wear' | 'Field-Tested' | 'Well-Worn' | 'Battle-Scarred' | 'Unknown'
  });

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [skinsRes, settingsRes, schedulerRes] = await Promise.all([
        fetch('/api/skins'),
        fetch('/api/settings'),
        fetch('/api/fetch/scheduler')
      ]);

      const skinsData = await skinsRes.json();
      const settingsData = await settingsRes.json();
      const schedulerData = await schedulerRes.json();

      if (skinsData.success) setSkins(skinsData.data);
      if (settingsData.success) setSettings(settingsData.data);
      if (schedulerData.success) setSchedulerStatus(schedulerData.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSkin = async () => {
    if (!newSkinUrl.trim()) return;

    try {
      const response = await fetch('/api/skins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newSkinUrl, exteriorOverride: newSkinExterior || undefined })
      });

      const data = await response.json();
      if (data.success) {
        setNewSkinUrl('');
        setNewSkinExterior('');
        loadData();
        toast.success('Skin added successfully!');
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Failed to add skin:', error);
      toast.error('Failed to add skin');
    }
  };

  const removeSkin = async (name: string, exterior: string) => {
    const confirmed = window.confirm(`Remove ${name} (${exterior}) from tracking?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/skins?name=${encodeURIComponent(name)}&exterior=${encodeURIComponent(exterior)}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        loadData();
        toast.success('Skin removed successfully!');
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Failed to remove skin:', error);
      toast.error('Failed to remove skin');
    }
  };

  const fetchData = async (fetchType: 'all' | 'single' = 'all', skinName?: string, skinExterior?: string) => {
    setFetching(true);
    try {
      const options: ScrapingOptions = {
        fetchType,
        priceType: fetchOptions.priceType,
        count: fetchOptions.count,
        exteriorFilter: fetchOptions.exteriorFilter
      };

      const body: any = options;
      if (fetchType === 'single' && skinName && skinExterior) {
        body.skinName = skinName;
        body.skinExterior = skinExterior;
      }

      const response = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (data.success) {
        await loadData(); // Wait for data to reload
        toast.success('Data fetched successfully!');
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setFetching(false);
    }
  };

  const updateSettings = async (newSettings: Partial<TrackermanSettings>) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });

      const data = await response.json();
      if (data.success) {
        setSettings({ ...settings!, ...newSettings });
        loadData();
        toast.success('Settings updated successfully!');
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const testDiscordWebhook = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Discord webhook test successful!');
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Failed to test Discord webhook:', error);
      toast.error('Failed to test Discord webhook');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading Trackerman...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
          },
        }}
      />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Trackerman</h1>
            <p className="text-zinc-400">CS2 Steam Market Item Tracker</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="outline"
              className="flex items-center gap-2 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>
        {/* Settings Modal */}
        {showSettings && settings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowSettings(false)} />
            <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Settings</h2>
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                  onClick={() => setShowSettings(false)}
                >
                  Close
                </Button>
              </div>

              {/* Auto Scheduler */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3 text-zinc-200">Auto Scheduler</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-zinc-300">
                    <Checkbox
                      id="scheduler-enabled"
                      checked={settings.autoScheduler.enabled}
                      onCheckedChange={(val) => updateSettings({
                        autoScheduler: { ...settings.autoScheduler, enabled: val }
                      })}
                      label="Enabled"
                    />
                  </div>
                  <div>
                    <Label htmlFor="interval" className="text-zinc-300">Interval (minutes)</Label>
                    <Input
                      id="interval"
                      type="number"
                      value={settings.autoScheduler.intervalMinutes}
                      onChange={(e) => updateSettings({
                        autoScheduler: { ...settings.autoScheduler, intervalMinutes: parseInt(e.target.value) }
                      })}
                      min="1"
                      className="bg-black border-zinc-700 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Discord Settings */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3 text-zinc-200">Discord Notifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-zinc-300">
                    <Checkbox
                      id="discord-enabled"
                      checked={settings.discord.enabled}
                      onCheckedChange={(val) => updateSettings({
                        discord: { ...settings.discord, enabled: val }
                      })}
                      label="Enabled"
                    />
                  </div>
                  <div>
                    <Label htmlFor="webhook-url" className="text-zinc-300">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      type="url"
                      value={settings.discord.webhookUrl || ''}
                      onChange={(e) => updateSettings({
                        discord: { ...settings.discord, webhookUrl: e.target.value }
                      })}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="bg-black border-zinc-700 text-white"
                    />
                  </div>
                  <div className="text-zinc-300">
                    <Checkbox
                      id="price-update"
                      checked={settings.discord.notifications.priceUpdate}
                      onCheckedChange={(val) => updateSettings({
                        discord: {
                          ...settings.discord,
                          notifications: { ...settings.discord.notifications, priceUpdate: val }
                        }
                      })}
                      label="Price Updates"
                    />
                  </div>
                  <div className="text-zinc-300">
                    <Checkbox
                      id="threshold-high"
                      checked={settings.discord.notifications.thresholdHigh}
                      onCheckedChange={(val) => updateSettings({
                        discord: {
                          ...settings.discord,
                          notifications: { ...settings.discord.notifications, thresholdHigh: val }
                        }
                      })}
                      label="High Threshold"
                    />
                  </div>
                  <div className="text-zinc-300">
                    <Checkbox
                      id="threshold-low"
                      checked={settings.discord.notifications.thresholdLow}
                      onCheckedChange={(val) => updateSettings({
                        discord: {
                          ...settings.discord,
                          notifications: { ...settings.discord.notifications, thresholdLow: val }
                        }
                      })}
                      label="Low Threshold"
                    />
                  </div>
                  <div>
                    <Button onClick={testDiscordWebhook} variant="outline" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800">
                      Test Webhook
                    </Button>
                  </div>
                </div>
              </div>

              {/* Scraping Settings */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3 text-zinc-200">Scraping Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="timeout" className="text-zinc-300">Timeout (ms)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={settings.scraping.timeoutMs}
                      onChange={(e) => updateSettings({
                        scraping: { ...settings.scraping, timeoutMs: parseInt(e.target.value) }
                      })}
                      min="1000"
                      className="bg-black border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="delay" className="text-zinc-300">Delay Between Requests (ms)</Label>
                    <Input
                      id="delay"
                      type="number"
                      value={settings.scraping.delayBetweenRequests}
                      onChange={(e) => updateSettings({
                        scraping: { ...settings.scraping, delayBetweenRequests: parseInt(e.target.value) }
                      })}
                      min="0"
                      className="bg-black border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="retries" className="text-zinc-300">Max Retries</Label>
                    <Input
                      id="retries"
                      type="number"
                      value={settings.scraping.maxRetries}
                      onChange={(e) => updateSettings({
                        scraping: { ...settings.scraping, maxRetries: parseInt(e.target.value) }
                      })}
                      min="0"
                      className="bg-black border-zinc-700 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Logging Settings */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-zinc-200">Logging Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-zinc-300">
                    <Checkbox
                      id="logging-enabled"
                      checked={settings.logging?.enabled || false}
                      onCheckedChange={(val) => updateSettings({
                        logging: { 
                          ...settings.logging, 
                          enabled: val,
                          file: settings.logging?.file || 'trackerman.log'
                        }
                      })}
                      label="Enable File Logging"
                    />
                  </div>
                  <div>
                    <Label htmlFor="log-file" className="text-zinc-300">Log File Name</Label>
                    <Input
                      id="log-file"
                      type="text"
                      value={settings.logging?.file || 'trackerman.log'}
                      onChange={(e) => updateSettings({
                        logging: { 
                          ...settings.logging, 
                          file: e.target.value || 'trackerman.log',
                          enabled: settings.logging?.enabled || false
                        }
                      })}
                      placeholder="trackerman.log"
                      className="bg-black border-zinc-700 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scheduler Status */}
        {schedulerStatus && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {schedulerStatus.enabled ? (
                  <CheckCircle className="h-5 w-5 text-zinc-300" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-zinc-300" />
                )}
                <span className="font-medium text-zinc-200">
                  Auto Scheduler: {schedulerStatus.enabled ? 'Enabled' : 'Disabled'}
                </span>
                {schedulerStatus.enabled && (
                  <span className="text-sm text-zinc-400">
                    (Every {schedulerStatus.intervalMinutes} minutes)
                  </span>
                )}
              </div>
              {schedulerStatus.lastRun && (
                <span className="text-sm text-zinc-400">
                  Last run: {new Date(schedulerStatus.lastRun).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Add New Skin */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Skin to Track</h2>
          <div className="flex gap-2">
            <Input
              value={newSkinUrl}
              onChange={(e) => setNewSkinUrl(e.target.value)}
              placeholder="https://steamcommunity.com/market/search?appid=730&q=karambit+fade"
              className="flex-1 bg-black border-zinc-700 text-white placeholder:text-zinc-500"
            />
            <select
              aria-label="Exterior override"
              value={newSkinExterior}
              onChange={(e) => setNewSkinExterior(e.target.value as any)}
              className="w-56 h-9 px-3 py-1 bg-black border border-zinc-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500"
            >
              <option value="">Detect Exterior</option>
              <option value="Factory New">Factory New</option>
              <option value="Minimal Wear">Minimal Wear</option>
              <option value="Field-Tested">Field-Tested</option>
              <option value="Well-Worn">Well-Worn</option>
              <option value="Battle-Scarred">Battle-Scarred</option>
              <option value="Unknown">Unknown</option>
            </select>
            <Button onClick={addSkin} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white">
              <Plus className="h-4 w-4" />
              Add Skin
            </Button>
          </div>
        </div>

        {/* Fetch Options */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Fetch Options</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="price-type" className="text-zinc-300">Price Type</Label>
              <select
                id="price-type"
                value={fetchOptions.priceType}
                onChange={(e) => setFetchOptions({...fetchOptions, priceType: e.target.value as 'lowest' | 'highest'})}
                className="w-full h-9 px-3 py-1 bg-black border border-zinc-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500"
              >
                <option value="lowest">Lowest Price</option>
                <option value="highest">Highest Price</option>
              </select>
            </div>
            <div>
              <Label htmlFor="count" className="text-zinc-300">Number of Items</Label>
              <Input
                id="count"
                type="number"
                value={fetchOptions.count}
                onChange={(e) => setFetchOptions({...fetchOptions, count: parseInt(e.target.value) || 1})}
                min="1"
                max="100"
                className="bg-black border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="exterior-filter" className="text-zinc-300">Exterior</Label>
              <select
                id="exterior-filter"
                value={fetchOptions.exteriorFilter}
                onChange={(e) => setFetchOptions({...fetchOptions, exteriorFilter: e.target.value as any})}
                className="w-full h-9 px-3 py-1 bg-black border border-zinc-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500"
              >
                <option value="">All</option>
                <option value="Factory New">Factory New</option>
                <option value="Minimal Wear">Minimal Wear</option>
                <option value="Field-Tested">Field-Tested</option>
                <option value="Well-Worn">Well-Worn</option>
                <option value="Battle-Scarred">Battle-Scarred</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => fetchData('all')} 
                disabled={fetching}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white w-full"
              >
                <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
                Fetch All Skins
              </Button>
            </div>
          </div>
        </div>

        {/* Tracked Skins */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-xl font-semibold">Tracked Skins ({skins.length})</h2>
          </div>
          
          {skins.length === 0 ? (
            <div className="p-8 text-center text-zinc-400">
              <p>No skins being tracked yet.</p>
              <p className="text-sm">Add a Steam market URL above to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {skins.map((skin, index) => (
                <div key={`${skin.name}-${skin.exterior}`} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-white">
                        {skin.name}
                      </h3>
                      <p className="text-sm text-zinc-400 mb-2">
                        Exterior: {skin.exterior}
                      </p>
                      <p className="text-sm text-zinc-400 mb-2">
                        Data points: {skin.skindata.length}
                      </p>
                      {skin.skindata.length > 0 && (() => {
                        const sortedData = skin.skindata.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                        const latest = sortedData[0];
                        return (
                          <div className="text-sm">
                            <p className="text-zinc-300">
                              Latest price: {latest.price} {latest.currency}
                            </p>
                            <p className="text-zinc-300">
                              Last updated: {new Date(latest.timestamp).toLocaleString()}
                            </p>
                            {latest.sellerName && (
                              <p className="text-zinc-400">
                                Seller: {latest.sellerName}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                      {skin.thresholds && (
                        <div className="mt-2 text-sm">
                          {skin.thresholds.high && (
                            <span className="inline-block bg-zinc-800 text-zinc-200 px-2 py-1 rounded mr-2">
                              High: {skin.thresholds.high}
                            </span>
                          )}
                          {skin.thresholds.low && (
                            <span className="inline-block bg-zinc-800 text-zinc-200 px-2 py-1 rounded">
                              Low: {skin.thresholds.low}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => fetchData('single', skin.name, skin.exterior)}
                        disabled={fetching}
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                        title={`Fetch ${fetchOptions.count} ${fetchOptions.priceType} price(s)`}
                      >
                        <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        onClick={() => removeSkin(skin.name, skin.exterior)}
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}