import type { AppTheme } from "./themePreference";

interface AppearanceSettingsProps {
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

const THEMES: Array<{
  id: AppTheme;
  name: string;
  description: string;
  sample: string;
}> = [
  {
    id: "parchment",
    name: "羊皮卷",
    description: "暖白纸张、深绿侧栏与衬线标题",
    sample: "典藏与版本",
  },
  {
    id: "minimal",
    name: "极简黑白",
    description: "纯白表面、黑灰文字与现代系统字体",
    sample: "清晰与专注",
  },
];

export function AppearanceSettings({ theme, onThemeChange }: AppearanceSettingsProps) {
  return (
    <section className="backup-section appearance-section" aria-labelledby="appearance-title">
      <div className="backup-section-heading">
        <div>
          <p className="eyebrow">APPEARANCE</p>
          <h3 id="appearance-title">颜色与字体</h3>
        </div>
        <span>即时生效</span>
      </div>
      <p className="backup-description">选择整套界面外观。主题会同步调整颜色、标题、正文和元数据字体，并在下次启动时继续使用。</p>
      <div className="theme-options" aria-label="外观主题">
        {THEMES.map((option) => (
          <button
            aria-pressed={theme === option.id}
            className="theme-option"
            data-theme-preview={option.id}
            key={option.id}
            onClick={() => onThemeChange(option.id)}
            type="button"
          >
            <span className="theme-preview" aria-hidden="true">
              <span />
              <span><i /><i /><i /></span>
            </span>
            <strong>{option.name}</strong>
            <small>{option.description}</small>
            <em>{option.sample}</em>
          </button>
        ))}
      </div>
    </section>
  );
}
