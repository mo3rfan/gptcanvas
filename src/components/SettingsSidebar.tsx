import type { Settings, TokenStats } from '../types';

interface SidebarProps {
    settings: Settings;
    onSettingsChange: (settings: Settings) => void;
    tokenStats: TokenStats;
}

export const SettingsSidebar: React.FC<SidebarProps> = ({ settings, onSettingsChange, tokenStats }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        onSettingsChange({ ...settings, [name]: value });
    };

    return (
        <div className="w-64 bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col gap-4 text-zinc-200">
            <h2 className="text-xl font-bold mb-2">LLM Settings</h2>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase text-zinc-500">API URL</label>
                <input
                    type="text"
                    name="apiUrl"
                    value={settings.apiUrl}
                    onChange={handleChange}
                    placeholder="https://api.openai.com/v1"
                    className="bg-zinc-800 border border-zinc-700 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase text-zinc-500">API Key</label>
                <input
                    type="password"
                    name="apiKey"
                    value={settings.apiKey}
                    onChange={handleChange}
                    placeholder="sk-..."
                    className="bg-zinc-800 border border-zinc-700 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase text-zinc-500">Model Name</label>
                <input
                    type="text"
                    name="model"
                    value={settings.model}
                    onChange={handleChange}
                    placeholder="gpt-5-mini"
                    className="bg-zinc-800 border border-zinc-700 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                />
            </div>

            {/* Token Statistics */}
            <div className="mt-6 p-4 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-800/30 rounded-lg">
                <h3 className="text-xs font-semibold uppercase text-blue-400 mb-3">Token Usage (Current Session)</h3>
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-400">Input</span>
                        <span className="text-sm font-mono font-bold text-green-400">{tokenStats.input.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-400">Output</span>
                        <span className="text-sm font-mono font-bold text-blue-400">{tokenStats.output.toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-zinc-700 my-1"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-zinc-300">Total</span>
                        <span className="text-base font-mono font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                            {tokenStats.total.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-auto text-[10px] text-zinc-600">
                Note: API settings will persist in local storage.
            </div>
        </div>
    );
};
