import { open, save } from "@tauri-apps/plugin-dialog";
import { useState } from "react";

import type { BackupPreferences } from "../../domain/commands";
import { commandClient } from "../../lib/commandClient";

const TIME_DIMENSION_KEY = "document-index.default-time-dimension";
const WORKSPACE_SPLIT_KEY = "document-index.workspace-split";
const JSON_FILTER = [{ name: "资料索引备份", extensions: ["json"] }];

interface BackupSettingsProps {
  onRestored: () => void;
}

export function BackupSettings({ onRestored }: BackupSettingsProps) {
  const [busy, setBusy] = useState<"export" | "restore">();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string }>();
  const [restorePath, setRestorePath] = useState<string>();

  async function exportBackup() {
    setFeedback(undefined);
    let path: string | null;
    try {
      path = await save({
        title: "导出资料索引备份",
        defaultPath: "document-index-backup.json",
        filters: JSON_FILTER,
      });
    } catch {
      setFeedback({ type: "error", message: "无法打开系统保存窗口。" });
      return;
    }
    if (!path) return;
    setBusy("export");
    setFeedback(undefined);
    const result = await commandClient.exportIndexBackup(path, readPreferences());
    setFeedback(result.ok
      ? { type: "success", message: `备份已导出，包含 ${result.data.documentCount} 条文档元数据。` }
      : { type: "error", message: result.error.message });
    setBusy(undefined);
  }

  async function restoreBackup() {
    setFeedback(undefined);
    let path: string | string[] | null;
    try {
      path = await open({
        title: "恢复资料索引备份",
        directory: false,
        multiple: false,
        filters: JSON_FILTER,
      });
    } catch {
      setFeedback({ type: "error", message: "无法打开系统文件选择窗口。" });
      return;
    }
    if (typeof path !== "string") return;
    setRestorePath(path);
  }

  async function confirmRestore() {
    if (!restorePath) return;
    setBusy("restore");
    try {
      const result = await commandClient.restoreIndexBackup(restorePath);
      if (result.ok) {
        safeStorageSet(TIME_DIMENSION_KEY, result.data.preferences.defaultTimeDimension);
        safeStorageSet(WORKSPACE_SPLIT_KEY, String(result.data.preferences.workspaceSplit));
        setFeedback({ type: "success", message: `索引已恢复，已重新校验 ${result.data.sourceCount} 个索引位置。` });
        setRestorePath(undefined);
        onRestored();
      } else {
        setFeedback({ type: "error", message: result.error.message });
      }
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <div className="backup-settings">
      <header className="backup-settings-header">
        <div>
          <p className="eyebrow">DOCUMENT LEDGER / 05</p>
          <h2 id="workspace-title">调整资料索引偏好</h2>
          <p>备份保存索引源、主题关系、文档元数据、人工归组规则、扩展名规则和界面偏好。</p>
        </div>
        <span className="local-badge">JSON / 本机文件</span>
      </header>
      {feedback && <p className={`backup-feedback backup-feedback-${feedback.type}`} role="status">{feedback.message}</p>}
      <section className="backup-section" aria-labelledby="backup-title">
        <div className="backup-section-heading">
          <div>
            <p className="eyebrow">LOCAL DATA</p>
            <h3 id="backup-title">索引配置备份与恢复</h3>
          </div>
          <span>VERSION 1</span>
        </div>
        <p className="backup-description">备份文件排除文档正文、预览内容、原始文件、扫描历史、错误记录和整理建议。恢复会整套替换当前索引配置，并重新检查本地路径。</p>
        <div className="backup-actions">
          <button disabled={busy !== undefined} onClick={() => void exportBackup()} type="button">
            {busy === "export" ? "正在导出" : "导出备份"}
          </button>
          <button disabled={busy !== undefined} onClick={() => void restoreBackup()} type="button">
            {busy === "restore" ? "正在恢复" : "从备份恢复"}
          </button>
        </div>
        {restorePath && (
          <div className="backup-confirmation" role="alert">
            <strong>确认替换当前索引配置</strong>
            <p>将恢复所选备份，并整套替换当前索引源、主题关系和人工归组规则。</p>
            <code>{restorePath}</code>
            <div className="backup-actions">
              <button disabled={busy !== undefined} onClick={() => setRestorePath(undefined)} type="button">取消恢复</button>
              <button disabled={busy !== undefined} onClick={() => void confirmRestore()} type="button">
                {busy === "restore" ? "正在恢复" : "确认替换并恢复"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function readPreferences(): BackupPreferences {
  const defaultTimeDimension = safeStorageGet(TIME_DIMENSION_KEY) === "createdAt"
    ? "createdAt"
    : "modifiedAt";
  const split = Number(safeStorageGet(WORKSPACE_SPLIT_KEY));
  return {
    defaultTimeDimension,
    workspaceSplit: Number.isFinite(split) && split >= 32 && split <= 68 ? split : 42,
  };
}

function safeStorageGet(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Restored index data remains valid when optional UI preferences cannot be saved.
  }
}
