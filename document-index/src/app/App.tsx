import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

import type { IndexSource, IndexStatus, ScanProgress, ScanRun } from "../domain/models";
import { OrganizeQueue } from "../features/organize/OrganizeQueue";
import { SearchWorkspace } from "../features/search/SearchWorkspace";
import { BackupSettings } from "../features/settings/BackupSettings";
import { SourceManager } from "../features/sources/SourceManager";
import { commandClient } from "../lib/commandClient";

type WorkspaceView = "search" | "library" | "organize" | "sources" | "settings";

const EMPTY_INDEX_STATUS: IndexStatus = {
  discoveredCount: 0,
  processedCount: 0,
  documentCount: 0,
  topicCount: 0,
  suggestionCount: 0,
  failureCount: 0,
};

const NAVIGATION: Array<{
  id: WorkspaceView;
  label: string;
  index: string;
  title: string;
  description: string;
}> = [
  { id: "search", label: "搜索工作台", index: "01", title: "在一个工作台里找到每个版本", description: "按名称、路径和时间检索本地资料。" },
  { id: "library", label: "全部资料", index: "02", title: "浏览已建立索引的全部资料", description: "按主题查看散落在不同目录中的文档版本。" },
  { id: "organize", label: "待整理", index: "03", title: "检查需要人工确认的归组", description: "处理低置信度主题和系统生成的合并建议。" },
  { id: "sources", label: "索引位置", index: "04", title: "管理应用可以扫描的位置", description: "添加、暂停或刷新本地磁盘与目录。" },
  { id: "settings", label: "设置", index: "05", title: "调整资料索引偏好", description: "管理文件类型、排序与本地数据设置。" },
];

export function App() {
  const [serviceStatus, setServiceStatus] = useState("正在连接本地索引服务");
  const [activeView, setActiveView] = useState<WorkspaceView>("search");
  const [indexStatus, setIndexStatus] = useState<IndexStatus>(EMPTY_INDEX_STATUS);
  const [dataRevision, setDataRevision] = useState(0);
  const [activeScanId, setActiveScanId] = useState<string>();
  const [sourceCount, setSourceCount] = useState<number>();

  useEffect(() => {
    let active = true;
    let stopListening = () => {};

    const refreshIndexStatus = async () => {
      const result = await commandClient.getIndexStatus();
      if (active && result.ok) setIndexStatus(result.data);
    };

    void commandClient.health().then((result) => {
      if (!active) return;
      setServiceStatus(result.ok ? "本地索引服务已就绪" : "本地索引服务暂不可用");
    });
    void refreshIndexStatus();
    void commandClient.listSources().then((result) => {
      if (!active || !result.ok) return;
      setSourceCount(result.data.length);
      if (result.data.length === 0) {
        setActiveView((current) => current === "search" ? "sources" : current);
      }
    });
    void listen<ScanProgress>("scan-progress", ({ payload }) => {
      if (!active) return;
      setActiveScanId(payload.status === "queued" || payload.status === "running" ? payload.id : undefined);
      setIndexStatus((current) => ({
        ...current,
        scanStatus: payload.status,
        discoveredCount: payload.discoveredCount,
        processedCount: payload.processedCount,
        topicCount: payload.topicCount,
        suggestionCount: payload.suggestionCount,
        failureCount: payload.failureCount,
        lastCompletedAt: payload.completedAt ?? current.lastCompletedAt,
      }));
      if (payload.status === "completed") void refreshIndexStatus();
    }).then((unlisten) => {
      if (active) stopListening = unlisten;
      else unlisten();
    }).catch(() => {
      if (active) setServiceStatus("本地索引事件通道暂不可用");
    });

    return () => {
      active = false;
      stopListening();
    };
  }, []);

  const view = NAVIGATION.find((item) => item.id === activeView) ?? NAVIGATION[0];
  const refreshIndexSummary = async () => {
    const result = await commandClient.getIndexStatus();
    if (result.ok) setIndexStatus(result.data);
  };
  const handleSourcesChanged = (sources: IndexSource[]) => {
    setSourceCount(sources.length);
    void refreshIndexSummary();
  };
  const handleScanStarted = (scan: ScanRun) => {
    setActiveScanId(scan.id);
    setIndexStatus((current) => ({
      ...current,
      scanStatus: scan.status,
      discoveredCount: scan.discoveredCount,
      processedCount: scan.processedCount,
      failureCount: scan.failureCount,
    }));
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">DI</span>
          <div>
            <p className="eyebrow">LOCAL ARCHIVE</p>
            <h1>资料索引</h1>
          </div>
        </div>
        <nav aria-label="主导航">
          {NAVIGATION.map((item) => (
            <button
              aria-current={activeView === item.id ? "page" : undefined}
              className={item.id === "settings" ? "settings-link" : undefined}
              key={item.id}
              onClick={() => setActiveView(item.id)}
              type="button"
            >
              <span aria-hidden="true">{item.index}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <IndexStatusBar
          activeScanId={activeScanId}
          onCancelled={() => setActiveScanId(undefined)}
          sourceCount={sourceCount}
          status={indexStatus}
        />
        <p className="service-status">{serviceStatus}</p>
      </aside>
      <section className={`workspace ${activeView === "search" ? "workspace-search" : ""} ${activeView === "sources" ? "workspace-sources" : ""} ${activeView === "organize" ? "workspace-organize" : ""} ${activeView === "settings" ? "workspace-settings" : ""}`} id={view.id} aria-labelledby="workspace-title">
        {activeView === "search" ? <SearchWorkspace key={dataRevision} /> : activeView === "library" ? <SearchWorkspace key={dataRevision} libraryMode /> : activeView === "sources" ? <SourceManager key={dataRevision} onScanStarted={handleScanStarted} onSourcesChanged={handleSourcesChanged} /> : activeView === "organize" ? <OrganizeQueue key={dataRevision} onSuggestionResolved={() => void refreshIndexSummary()} /> : activeView === "settings" ? <BackupSettings onRestored={() => { setDataRevision((current) => current + 1); void refreshIndexSummary(); }} /> : (
          <>
            <header className="workspace-header">
              <div>
                <p className="eyebrow">DOCUMENT LEDGER / {view.index}</p>
                <h2 id="workspace-title">{view.title}</h2>
                <p>{view.description} 索引只保存文件系统元数据。</p>
              </div>
              <span className="local-badge">本机离线索引</span>
            </header>
            <div className="empty-state">
              <span>{view.index}</span>
              <h3>{view.label}工作区</h3>
              <p>此区域将在对应界面任务中接入完整操作，主导航与索引状态保持持续可用。</p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function IndexStatusBar({ activeScanId, onCancelled, sourceCount, status }: {
  activeScanId?: string;
  onCancelled: () => void;
  sourceCount?: number;
  status: IndexStatus;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string>();
  const isScanning = status.scanStatus === "queued" || status.scanStatus === "running";
  const progress = status.discoveredCount > 0
    ? Math.min(100, Math.round((status.processedCount / status.discoveredCount) * 100))
    : 0;
  const statusLabel = sourceCount === 0
    ? "请添加索引位置"
    : status.scanStatus === "running"
    ? "正在扫描"
    : status.scanStatus === "queued"
      ? "等待扫描"
      : status.scanStatus === "failed"
        ? "扫描遇到错误"
        : status.lastCompletedAt
          ? "索引已就绪"
          : "等待首次扫描";

  return (
    <section className="index-status" aria-label="索引状态">
      <div className="status-heading">
        <span className="status-pulse" data-active={isScanning} aria-hidden="true" />
        <div>
          <p>索引状态</p>
          <strong>{statusLabel}</strong>
        </div>
        {isScanning && <span>{progress}%</span>}
      </div>
      {isScanning && (
        <>
          <div className="progress-track" role="progressbar" aria-label="扫描进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <button
            disabled={!activeScanId || cancelling}
            onClick={() => {
              if (!activeScanId) return;
              setCancelling(true);
              setCancelError(undefined);
              void commandClient.cancelScan(activeScanId).then((result) => {
                setCancelling(false);
                if (result.ok) onCancelled();
                else setCancelError("暂时无法取消扫描，请稍后重试。");
              });
            }}
            type="button"
          >
            {cancelling ? "正在取消" : "取消扫描"}
          </button>
        </>
      )}
      {cancelError && <p role="alert">{cancelError}</p>}
      <dl className="index-metrics">
        <div><dt>文件</dt><dd>{formatCount(status.documentCount)}</dd></div>
        <div><dt>主题</dt><dd>{formatCount(status.topicCount)}</dd></div>
        <div><dt>待整理</dt><dd>{formatCount(status.suggestionCount)}</dd></div>
        <div><dt>失败</dt><dd>{formatCount(status.failureCount)}</dd></div>
      </dl>
      <p className="last-completed">
        最近完成 <time dateTime={status.lastCompletedAt}>{formatCompletedAt(status.lastCompletedAt)}</time>
      </p>
    </section>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatCompletedAt(value?: string) {
  if (!value) return "暂无记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
