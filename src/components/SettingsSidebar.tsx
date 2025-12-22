import type { Settings } from '../types';

interface SidebarProps {
    settings: Settings;
    onSettingsChange: (settings: Settings) => void;
}

export const SettingsSidebar: React.FC<SidebarProps> = ({ settings, onSettingsChange }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        onSettingsChange({ ...settings, [name]: value });
    };

    return (
        <div className="w-64 bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col gap-4 text-zinc-200">
            <h2 className="text-xl font-bold mb-2">LLM Settings</h2>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase text-zinc-500">API Box URL</label>
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
                    placeholder="gpt-3.5-turbo"
                    className="bg-zinc-800 border border-zinc-700 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                />
            </div>

            <div className="mt-auto text-[10px] text-zinc-600">
                Highlight any text in the chat to branch out.
            </div>
        </div>
    );
};
