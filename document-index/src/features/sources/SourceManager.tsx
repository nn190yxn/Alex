import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";

import type { ExtensionRule, IndexSource, ScanError, ScanProgress, ScanRun } from "../../domain/models";
import { commandClient } from "../../lib/commandClient";

const TERMINAL_SCAN_STATUSES = new Set(["completed", "cancelled", "failed"]);

export function SourceManager({ onScanStarted, onSourcesChanged }: {
  onScanStarted?: (scan: ScanRun) => void;
  onSourcesChanged?: (sources: IndexSource[]) => void;
}) {
  const [sources, setSources] = useState<IndexSource[]>([]);
  const [rules, setRules] = useState<ExtensionRule[]>([]);
  const [errors, setErrors] = useState<ScanError[]>([]);
  const [customExtension, setCustomExtension] = useState("");
  const [errorsOpen, setErrorsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string>();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string }>();

  useEffect(() => {
    let active = true;
    let stopListening = () => {};

    const load = async () => {
      const [sourceResult, extensionResult, errorResult] = await Promise.all([
        commandClient.listSources(),
        commandClient.listExtensions(),
        commandClient.listScanErrors(),
      ]);
      if (!active) return;
      if (sourceResult.ok) {
        setSources(sourceResult.data);
        onSourcesChanged?.(sourceResult.data);
      }
      if (extensionResult.ok) setRules(extensionResult.data);
      if (errorResult.ok) setErrors(errorResult.data);
      const failure = [sourceResult, extensionResult, errorResult].find((result) => !result.ok);
      if (failure && !failure.ok) setFeedback({ type: "error", message: failure.error.message });
      setLoading(false);
    };

    void load();
    void listen<ScanProgress>("scan-progress", ({ payload }) => {
      if (!active || !TERMINAL_SCAN_STATUSES.has(payload.status)) return;
      void Promise.all([
        commandClient.listSources(),
        commandClient.listScanErrors(payload.id),
      ]).then(([sourceResult, errorResult]) => {
        if (!active) return;
        if (sourceResult.ok) {
          setSources(sourceResult.data);
          onSourcesChanged?.(sourceResult.data);
        }
        if (errorResult.ok) setErrors(errorResult.data);
      });
    }).then((unlisten) => {
      if (active) stopListening = unlisten;
      else unlisten();
    }).catch(() => {
      if (active) setFeedback({ type: "error", message: "扫描事件通道暂时不可用。" });
    });

    return () => {
      active = false;
      stopListening();
    };
  }, []);

  const addSource = async () => {
    let selected: string | string[] | null;
    try {
      selected = await open({
        title: "选择需要建立索引的目录",
        directory: true,
        multiple: false,
      });
    } catch {
      setFeedback({ type: "error", message: "无法打开系统目录选择窗口。" });
      return;
    }
    if (typeof selected !== "string") return;

    setBusyAction("add");
    setFeedback(undefined);
    const added = await commandClient.addSource(selected);
    if (!added.ok) {
      setFeedback({ type: "error", message: added.error.message });
      setBusyAction(undefined);
      return;
    }
    const nextSources = [...sources, added.data];
    setSources(nextSources);
    onSourcesChanged?.(nextSources);
    const scan = await commandClient.startScan([added.data.id]);
    if (scan.ok) onScanStarted?.(scan.data);
    setFeedback(scan.ok
      ? { type: "success", message: `已添加 ${added.data.displayName}，扫描已开始。` }
      : { type: "error", message: scan.error.message });
    setBusyAction(undefined);
  };

  const toggleSource = async (source: IndexSource) => {
    setBusyAction(`toggle:${source.id}`);
    setFeedback(undefined);
    const result = await commandClient.setSourceEnabled(source.id, !source.enabled);
    if (result.ok) {
      const nextSources = sources.map((item) => item.id === result.data.id ? result.data : item);
      setSources(nextSources);
      onSourcesChanged?.(nextSources);
      setFeedback({
        type: "success",
        message: result.data.enabled ? `${result.data.displayName} 已恢复。` : `${result.data.displayName} 已暂停。`,
      });
    } else {
      setFeedback({ type: "error", message: result.error.message });
    }
    setBusyAction(undefined);
  };

  const refreshSource = async (source: IndexSource) => {
    setBusyAction(`scan:${source.id}`);
    setFeedback(undefined);
    const result = await commandClient.startScan([source.id]);
    if (result.ok) onScanStarted?.(result.data);
    setFeedback(result.ok
      ? { type: "success", message: `${source.displayName} 正在刷新索引。` }
      : { type: "error", message: result.error.message });
    setBusyAction(undefined);
  };

  const toggleExtension = (extension: string) => {
    setRules((current) => current.map((rule) =>
      rule.extension === extension ? { ...rule, enabled: !rule.enabled } : rule));
    setFeedback(undefined);
  };

  const addCustomExtension = () => {
    const extension = customExtension.trim().replace(/^\.+/, "").toLowerCase();
    if (!/^[a-z0-9]{1,16}$/.test(extension)) {
      setFeedback({ type: "error", message: "扩展名需为 1 到 16 位字母或数字。" });
      return;
    }
    setRules((current) => {
      const existing = current.find((rule) => rule.extension === extension);
      if (existing) return current.map((rule) => rule.extension === extension ? { ...rule, enabled: true } : rule);
      return [...current, { id: `draft-${extension}`, extension, builtIn: false, enabled: true }];
    });
    setCustomExtension("");
    setFeedback(undefined);
  };

  const saveExtensions = async () => {
    setBusyAction("extensions");
    setFeedback(undefined);
    const enabled = rules.filter((rule) => rule.enabled).map((rule) => rule.extension);
    const result = await commandClient.updateExtensions(enabled);
    if (result.ok) {
      setRules(result.data);
      setFeedback({ type: "success", message: "文件类型规则已保存，将在下一次扫描时应用。" });
    } else {
      setFeedback({ type: "error", message: result.error.message });
    }
    setBusyAction(undefined);
  };

  return (
    <div className="source-manager">
      <header className="source-manager-header">
        <div>
          <p className="eyebrow">DOCUMENT LEDGER / 04</p>
          <h2 id="workspace-title">管理应用可以扫描的位置</h2>
          <p>添加本地磁盘或目录，扫描只读取文件系统元数据。</p>
        </div>
        <button disabled={busyAction === "add"} onClick={() => void addSource()} type="button">
          {busyAction === "add" ? "正在添加" : "添加索引位置"}
        </button>
      </header>

      {feedback && <p className={`source-feedback source-feedback-${feedback.type}`} role="status">{feedback.message}</p>}

      <section className="source-section" aria-labelledby="source-list-title">
        <div className="source-section-heading">
          <div><p className="eyebrow">INDEX SOURCES</p><h3 id="source-list-title">索引位置</h3></div>
          <span>{sources.length} 个位置</span>
        </div>
        {loading ? <p className="source-empty">正在读取索引配置。</p> : sources.length === 0 ? (
          <div className="source-onboarding">
            <p className="eyebrow">FIRST INDEX</p>
            <h4>选择资料目录，开始建立本地索引</h4>
            <p>应用只读取文件名、路径、大小和文件时间。目录保存后会立即开始首次扫描。</p>
            <button disabled={busyAction === "add"} onClick={() => void addSource()} type="button">
              {busyAction === "add" ? "正在添加" : "选择资料目录"}
            </button>
          </div>
        ) : (
          <div className="source-list">
            {sources.map((source) => (
              <article className="source-card" key={source.id}>
                <div className="source-card-main">
                  <div className="source-title-line">
                    <h4>{source.displayName}</h4>
                    <span data-status={source.status}>{sourceStatusLabel(source.status)}</span>
                  </div>
                  <code>{source.path}</code>
                  <dl>
                    <div><dt>添加时间</dt><dd>{formatDateTime(source.addedAt)}</dd></div>
                    <div><dt>最近扫描</dt><dd>{formatDateTime(source.lastScanAt)}</dd></div>
                    <div><dt>最近成功</dt><dd>{formatDateTime(source.lastSuccessAt)}</dd></div>
                  </dl>
                </div>
                <div className="source-card-actions">
                  <button disabled={Boolean(busyAction)} onClick={() => void toggleSource(source)} type="button">
                    {source.enabled ? "暂停" : "恢复"}
                  </button>
                  <button disabled={Boolean(busyAction) || !source.enabled} onClick={() => void refreshSource(source)} type="button">
                    {busyAction === `scan:${source.id}` ? "启动中" : "手动刷新"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="source-settings-grid">
        <section className="source-section extension-settings" aria-labelledby="extension-title">
          <div className="source-section-heading">
            <div><p className="eyebrow">FILE TYPES</p><h3 id="extension-title">文档扩展名</h3></div>
            <span>{rules.filter((rule) => rule.enabled).length} 项启用</span>
          </div>
          <div className="extension-grid">
            {rules.map((rule) => (
              <label key={rule.id}>
                <input checked={rule.enabled} disabled={busyAction === "extensions"} onChange={() => toggleExtension(rule.extension)} type="checkbox" />
                <span>.{rule.extension}</span>
                <small>{rule.builtIn ? "默认" : "自定义"}</small>
              </label>
            ))}
          </div>
          <div className="custom-extension-row">
            <label><span>添加自定义扩展名</span><input aria-label="自定义扩展名" disabled={busyAction === "extensions"} onChange={(event) => setCustomExtension(event.target.value)} placeholder="例如 odt" value={customExtension} /></label>
            <button disabled={busyAction === "extensions"} onClick={addCustomExtension} type="button">加入规则</button>
            <button disabled={Boolean(busyAction) || rules.every((rule) => !rule.enabled)} onClick={() => void saveExtensions()} type="button">保存文件类型</button>
          </div>
        </section>

        <section className="source-section scan-errors" aria-labelledby="scan-error-title">
          <div className="source-section-heading">
            <div><p className="eyebrow">SCAN LOG</p><h3 id="scan-error-title">扫描错误</h3></div>
            <button aria-expanded={errorsOpen} onClick={() => setErrorsOpen((current) => !current)} type="button">
              {errorsOpen ? "收起错误" : `查看错误 (${errors.length})`}
            </button>
          </div>
          {!errorsOpen ? <p className="source-empty">保留最近一次扫描中的失败路径，其他位置会继续处理。</p> : errors.length === 0 ? (
            <p className="source-empty">最近一次扫描没有记录失败路径。</p>
          ) : (
            <ul className="scan-error-list">
              {errors.map((error, index) => (
                <li key={`${error.scanId}:${error.path}:${index}`}>
                  <strong>{error.errorType}</strong>
                  <code>{error.path}</code>
                  <span>{formatDateTime(error.occurredAt)} · {error.retryStatus}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function sourceStatusLabel(status: IndexSource["status"]) {
  return {
    ready: "可扫描",
    scanning: "扫描中",
    unavailable: "无法访问",
    paused: "已暂停",
    error: "扫描错误",
  }[status];
}

function formatDateTime(value?: string) {
  if (!value) return "暂无记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
