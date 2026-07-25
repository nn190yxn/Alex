import { useEffect, useRef, useState } from "react";

import type { DocumentSummary, PreviewContent, PreviewSession, PreviewViewport } from "../../domain/models";
import { commandClient } from "../../lib/commandClient";

interface PreviewPaneProps {
  document?: DocumentSummary;
  fullWidth: boolean;
  onCollapse: () => void;
  onToggleFullWidth: () => void;
}

export function PreviewPane({ document, fullWidth, onCollapse, onToggleFullWidth }: PreviewPaneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<PreviewSession>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [zoom, setZoom] = useState(100);
  const [sectionIndex, setSectionIndex] = useState(0);

  useEffect(() => {
    let active = true;
    let createdSessionId: string | undefined;
    setSession(undefined);
    setError(undefined);
    setZoom(100);
    setSectionIndex(0);

    if (!document) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    const openSession = async () => {
      const result = await commandClient.createPreviewSession(document.id, measureViewport(hostRef.current));
      if (!result.ok) {
        if (active) {
          setLoading(false);
          setError("这个文件暂时无法建立预览会话。你仍可使用系统程序打开或定位文件。");
        }
        return;
      }

      createdSessionId = result.data.id;
      if (!active) {
        void commandClient.closePreviewSession(result.data.id);
        return;
      }
      setSession(result.data);
      setLoading(false);
    };
    void openSession();

    return () => {
      active = false;
      if (createdSessionId) void commandClient.closePreviewSession(createdSessionId);
    };
  }, [document]);

  useEffect(() => {
    if (!session || !hostRef.current) return;
    const host = hostRef.current;
    const resize = () => {
      void commandClient.resizePreviewSession(session.id, measureViewport(host));
    };

    resize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    return () => observer.disconnect();
  }, [session]);

  const canZoom = session?.content.type === "text"
    || session?.content.type === "office"
    || (session?.content.type === "binary" && session.content.mediaType.startsWith("image/"));

  return (
    <div className="preview-pane">
      <header className="preview-pane-header">
        <div>
          <p className="eyebrow">FILE PREVIEW</p>
          <h3>{document?.fileName ?? "文件预览"}</h3>
          {document && <p>{document.extension.toUpperCase()} · {formatSize(document.sizeBytes)}</p>}
        </div>
        <div className="preview-layout-actions" aria-label="预览布局" role="toolbar">
          <button onClick={onToggleFullWidth} type="button">{fullWidth ? "恢复分栏" : "工作区全宽"}</button>
          <button onClick={onCollapse} type="button">折叠预览</button>
        </div>
      </header>

      {document && (
        <div className="preview-toolbar" aria-label="预览工具" role="toolbar">
          <span>{session ? `${session.extension.toUpperCase()} · ${formatSize(session.sizeBytes)}` : "正在准备只读内容"}</span>
          {canZoom && (
            <div className="preview-zoom">
              <button aria-label="缩小预览" disabled={zoom <= 60} onClick={() => setZoom((value) => Math.max(60, value - 20))} type="button">−</button>
              <output aria-label="预览缩放比例">{zoom}%</output>
              <button aria-label="放大预览" disabled={zoom >= 180} onClick={() => setZoom((value) => Math.min(180, value + 20))} type="button">＋</button>
            </div>
          )}
        </div>
      )}

      <div className="preview-host" ref={hostRef}>
        {!document && <PreviewState title="选择一个文件版本" description="版本列表中的“预览”会在此按需加载只读内容。" />}
        {document && loading && <PreviewState title="正在加载只读预览" description="文件正文只保留在当前预览会话中。" />}
        {document && error && <PreviewFallback document={document} message={error} />}
        {document && session && (
          <PreviewBody
            content={session.content}
            document={document}
            fileName={session.fileName}
            onSectionChange={setSectionIndex}
            sectionIndex={sectionIndex}
            zoom={zoom}
          />
        )}
      </div>
    </div>
  );
}

function PreviewBody({ content, document, fileName, sectionIndex, onSectionChange, zoom }: {
  content: PreviewContent;
  document: DocumentSummary;
  fileName: string;
  sectionIndex: number;
  onSectionChange: (index: number) => void;
  zoom: number;
}) {
  if (content.type === "text") {
    return <div className="preview-scroll"><pre style={{ fontSize: `${zoom}%` }}>{content.text}</pre></div>;
  }
  if (content.type === "binary") {
    return <BinaryPreview content={content} fileName={fileName} zoom={zoom} />;
  }
  if (content.type === "office") {
    const current = content.sections[sectionIndex] ?? content.sections[0];
    if (!current) return <PreviewFallback document={document} message="文件没有可展示的只读内容。" />;
    return (
      <div className="office-preview">
        <nav aria-label="文档页面或工作表">
          {content.sections.map((section, index) => (
            <button aria-current={index === sectionIndex ? "page" : undefined} key={`${section.label}-${index}`} onClick={() => onSectionChange(index)} type="button">
              {section.label}
            </button>
          ))}
        </nav>
        <div className="preview-scroll"><pre style={{ fontSize: `${zoom}%` }}>{current.text}</pre></div>
      </div>
    );
  }
  if (content.type === "native") {
    return <div className="native-preview-status"><span>Windows 系统预览器</span><p>只读内容由当前系统注册的 Preview Handler 显示。</p></div>;
  }
  return <PreviewFallback document={document} message={limitMessage(content.reason)} />;
}

function BinaryPreview({ content, fileName, zoom }: {
  content: Extract<PreviewContent, { type: "binary" }>;
  fileName: string;
  zoom: number;
}) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    const bytes = Uint8Array.from(window.atob(content.dataBase64), (character) => character.charCodeAt(0));
    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: content.mediaType }));
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [content.dataBase64, content.mediaType]);

  if (!url) return <PreviewState title="正在准备文件画面" description="预览资源正在当前会话内解码。" />;
  if (content.mediaType === "application/pdf") {
    return <object aria-label={`${fileName} PDF 预览`} className="pdf-preview" data={url} type={content.mediaType} />;
  }
  return <div className="image-preview"><img alt={`${fileName} 预览`} src={url} style={{ width: `${zoom}%` }} /></div>;
}

function PreviewFallback({ document, message }: { document: DocumentSummary; message: string }) {
  return (
    <div className="preview-fallback">
      <p className="eyebrow">PREVIEW LIMITED</p>
      <h4>当前使用系统操作确认文件</h4>
      <p>{message}</p>
      <dl>
        <div><dt>文件</dt><dd>{document.fileName}</dd></div>
        <div><dt>大小</dt><dd>{formatSize(document.sizeBytes)}</dd></div>
        <div><dt>位置</dt><dd>{document.absolutePath}</dd></div>
      </dl>
      <div>
        <button onClick={() => void commandClient.openDocument(document.id)} type="button">默认程序打开</button>
        <button onClick={() => void commandClient.revealDocument(document.id)} type="button">打开所在目录</button>
      </div>
    </div>
  );
}

function PreviewState({ title, description }: { title: string; description: string }) {
  return <div className="preview-state"><strong>{title}</strong><p>{description}</p></div>;
}

function measureViewport(element: HTMLElement | null): PreviewViewport {
  const bounds = element?.getBoundingClientRect();
  return {
    x: Math.max(0, Math.round(bounds?.left ?? 0)),
    y: Math.max(0, Math.round(bounds?.top ?? 0)),
    width: Math.max(1, Math.round(bounds?.width ?? 1)),
    height: Math.max(1, Math.round(bounds?.height ?? 1)),
  };
}

function limitMessage(reason: Extract<PreviewContent, { type: "limited" }>["reason"]) {
  if (reason === "fileTooLarge") return "文件超过当前格式的安全预览大小限制。";
  if (reason === "invalidContent") return "文件内容无法通过安全只读解析器加载。";
  return "当前文件类型缺少可用的内置或 Windows 预览器。";
}

function formatSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
