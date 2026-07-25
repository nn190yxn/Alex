use std::{
    path::{Path, PathBuf},
    sync::{
        mpsc::{self, Receiver, Sender},
        Arc,
    },
    thread,
    time::Duration,
};

use uuid::Uuid;

use crate::domain::{
    error::{DomainError, ErrorCode},
    models::PreviewViewport,
};

const HOST_RESPONSE_TIMEOUT: Duration = Duration::from_secs(10);

pub struct WindowsPreviewHost {
    sender: Sender<HostRequest>,
}

impl WindowsPreviewHost {
    pub fn new() -> Arc<Self> {
        Self::spawn(SystemPreviewBackend::new)
    }

    pub fn start(
        &self,
        path: PathBuf,
        parent_window: isize,
        viewport: PreviewViewport,
    ) -> Result<String, DomainError> {
        validate_legacy_office_path(&path)?;
        validate_viewport(viewport)?;
        if parent_window == 0 {
            return Err(invalid_input("parentWindow"));
        }
        let session_id = Uuid::new_v4().to_string();
        let (response, receiver) = mpsc::channel();
        self.sender
            .send(HostRequest::Start {
                session_id: session_id.clone(),
                path,
                parent_window,
                viewport,
                response,
            })
            .map_err(|_| host_unavailable())?;
        receive(receiver)?;
        Ok(session_id)
    }

    pub fn resize(&self, session_id: &str, viewport: PreviewViewport) -> Result<(), DomainError> {
        validate_viewport(viewport)?;
        self.request(|response| HostRequest::Resize {
            session_id: session_id.into(),
            viewport,
            response,
        })
    }

    pub fn unload(&self, session_id: &str) -> Result<(), DomainError> {
        self.request(|response| HostRequest::Unload {
            session_id: session_id.into(),
            response,
        })
    }

    fn request(
        &self,
        request: impl FnOnce(Sender<Result<(), DomainError>>) -> HostRequest,
    ) -> Result<(), DomainError> {
        let (response, receiver) = mpsc::channel();
        self.sender
            .send(request(response))
            .map_err(|_| host_unavailable())?;
        receive(receiver)
    }

    fn spawn<B, F>(factory: F) -> Arc<Self>
    where
        B: PreviewBackend + 'static,
        F: FnOnce() -> Result<B, DomainError> + Send + 'static,
    {
        let (sender, receiver) = mpsc::channel();
        thread::spawn(move || run_worker(receiver, factory()));
        Arc::new(Self { sender })
    }
}

impl Drop for WindowsPreviewHost {
    fn drop(&mut self) {
        let _ = self.sender.send(HostRequest::Shutdown);
    }
}

enum HostRequest {
    Start {
        session_id: String,
        path: PathBuf,
        parent_window: isize,
        viewport: PreviewViewport,
        response: Sender<Result<(), DomainError>>,
    },
    Resize {
        session_id: String,
        viewport: PreviewViewport,
        response: Sender<Result<(), DomainError>>,
    },
    Unload {
        session_id: String,
        response: Sender<Result<(), DomainError>>,
    },
    Shutdown,
}

trait PreviewBackend {
    fn start(
        &mut self,
        path: &Path,
        parent_window: isize,
        viewport: PreviewViewport,
    ) -> Result<(), DomainError>;
    fn resize(&mut self, viewport: PreviewViewport) -> Result<(), DomainError>;
    fn unload(&mut self) -> Result<(), DomainError>;
}

fn run_worker<B: PreviewBackend>(receiver: Receiver<HostRequest>, backend: Result<B, DomainError>) {
    let mut backend = match backend {
        Ok(backend) => backend,
        Err(error) => {
            reject_requests(receiver, error);
            return;
        }
    };
    let mut active_session: Option<String> = None;
    while let Ok(request) = receiver.recv() {
        match request {
            HostRequest::Start {
                session_id,
                path,
                parent_window,
                viewport,
                response,
            } => {
                let unload_result = if active_session.is_some() {
                    backend.unload()
                } else {
                    Ok(())
                };
                if unload_result.is_ok() {
                    active_session = None;
                }
                let result =
                    unload_result.and_then(|()| backend.start(&path, parent_window, viewport));
                if result.is_ok() {
                    active_session = Some(session_id);
                }
                let _ = response.send(result);
            }
            HostRequest::Resize {
                session_id,
                viewport,
                response,
            } => {
                let result = ensure_active(&active_session, &session_id)
                    .and_then(|()| backend.resize(viewport));
                let _ = response.send(result);
            }
            HostRequest::Unload {
                session_id,
                response,
            } => {
                let result =
                    ensure_active(&active_session, &session_id).and_then(|()| backend.unload());
                if result.is_ok() {
                    active_session = None;
                }
                let _ = response.send(result);
            }
            HostRequest::Shutdown => {
                if active_session.is_some() {
                    let _ = backend.unload();
                }
                break;
            }
        }
    }
}

fn reject_requests(receiver: Receiver<HostRequest>, error: DomainError) {
    while let Ok(request) = receiver.recv() {
        match request {
            HostRequest::Start { response, .. }
            | HostRequest::Resize { response, .. }
            | HostRequest::Unload { response, .. } => {
                let _ = response.send(Err(error.clone()));
            }
            HostRequest::Shutdown => break,
        }
    }
}

fn receive(receiver: Receiver<Result<(), DomainError>>) -> Result<(), DomainError> {
    receiver
        .recv_timeout(HOST_RESPONSE_TIMEOUT)
        .map_err(|_| host_unavailable())?
}

fn ensure_active(active: &Option<String>, session_id: &str) -> Result<(), DomainError> {
    if active.as_deref() == Some(session_id) {
        Ok(())
    } else {
        Err(DomainError {
            code: ErrorCode::InvalidInput,
            message: "The native preview session is no longer active.".into(),
            field: Some(session_id.into()),
        })
    }
}

fn validate_legacy_office_path(path: &Path) -> Result<(), DomainError> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase);
    if matches!(extension.as_deref(), Some("doc" | "xls" | "ppt")) {
        Ok(())
    } else {
        Err(invalid_input("documentId"))
    }
}

fn validate_viewport(viewport: PreviewViewport) -> Result<(), DomainError> {
    if viewport.width > 0 && viewport.height > 0 {
        Ok(())
    } else {
        Err(invalid_input("viewport"))
    }
}

fn invalid_input(field: &str) -> DomainError {
    DomainError {
        code: ErrorCode::InvalidInput,
        message: "The native preview parameters are invalid.".into(),
        field: Some(field.into()),
    }
}

fn host_unavailable() -> DomainError {
    DomainError {
        code: ErrorCode::FileSystemError,
        message: "The Windows preview handler is unavailable.".into(),
        field: None,
    }
}

#[cfg(not(target_os = "windows"))]
struct SystemPreviewBackend;

#[cfg(not(target_os = "windows"))]
impl SystemPreviewBackend {
    fn new() -> Result<Self, DomainError> {
        Err(host_unavailable())
    }
}

#[cfg(not(target_os = "windows"))]
impl PreviewBackend for SystemPreviewBackend {
    fn start(
        &mut self,
        _path: &Path,
        _parent_window: isize,
        _viewport: PreviewViewport,
    ) -> Result<(), DomainError> {
        Err(host_unavailable())
    }

    fn resize(&mut self, _viewport: PreviewViewport) -> Result<(), DomainError> {
        Err(host_unavailable())
    }

    fn unload(&mut self) -> Result<(), DomainError> {
        Err(host_unavailable())
    }
}

#[cfg(target_os = "windows")]
mod system_backend {
    use std::{ffi::c_void, os::windows::ffi::OsStrExt};

    use windows::{
        core::{Interface, PCWSTR, PWSTR},
        Win32::{
            Foundation::{HWND, RECT},
            System::Com::{
                CLSIDFromString, CoCreateInstance, CoInitializeEx, CoUninitialize,
                CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED, STGM_READ,
            },
            UI::Shell::{
                AssocQueryStringW, IPreviewHandler, PropertiesSystem::IInitializeWithFile,
                ASSOCF_INIT_DEFAULTTOSTAR, ASSOCSTR_SHELLEXTENSION,
            },
        },
    };

    use super::*;

    pub(super) struct SystemPreviewBackend {
        handler: Option<IPreviewHandler>,
        _apartment: ComApartment,
    }

    impl SystemPreviewBackend {
        pub(super) fn new() -> Result<Self, DomainError> {
            unsafe {
                CoInitializeEx(None, COINIT_APARTMENTTHREADED)
                    .ok()
                    .map_err(|_| host_unavailable())?;
            }
            Ok(Self {
                handler: None,
                _apartment: ComApartment,
            })
        }
    }

    impl PreviewBackend for SystemPreviewBackend {
        fn start(
            &mut self,
            path: &Path,
            parent_window: isize,
            viewport: PreviewViewport,
        ) -> Result<(), DomainError> {
            let clsid = preview_handler_clsid(path)?;
            let handler: IPreviewHandler = unsafe {
                CoCreateInstance(&clsid, None, CLSCTX_INPROC_SERVER)
                    .map_err(|_| host_unavailable())?
            };
            let initializer: IInitializeWithFile =
                handler.cast().map_err(|_| host_unavailable())?;
            let path_wide = wide(path.as_os_str());
            let rectangle = rectangle(viewport);
            unsafe {
                initializer
                    .Initialize(PCWSTR(path_wide.as_ptr()), STGM_READ.0 as u32)
                    .map_err(|_| host_unavailable())?;
                handler
                    .SetWindow(HWND(parent_window as *mut c_void), &rectangle)
                    .map_err(|_| host_unavailable())?;
                handler.DoPreview().map_err(|_| host_unavailable())?;
            }
            self.handler = Some(handler);
            Ok(())
        }

        fn resize(&mut self, viewport: PreviewViewport) -> Result<(), DomainError> {
            let handler = self.handler.as_ref().ok_or_else(host_unavailable)?;
            unsafe {
                handler
                    .SetRect(&rectangle(viewport))
                    .map_err(|_| host_unavailable())
            }
        }

        fn unload(&mut self) -> Result<(), DomainError> {
            if let Some(handler) = self.handler.take() {
                unsafe { handler.Unload().map_err(|_| host_unavailable()) }
            } else {
                Ok(())
            }
        }
    }

    impl Drop for SystemPreviewBackend {
        fn drop(&mut self) {
            let _ = self.unload();
        }
    }

    struct ComApartment;

    impl Drop for ComApartment {
        fn drop(&mut self) {
            unsafe { CoUninitialize() };
        }
    }

    fn preview_handler_clsid(path: &Path) -> Result<windows::core::GUID, DomainError> {
        let extension = path
            .extension()
            .and_then(|value| value.to_str())
            .ok_or_else(host_unavailable)?;
        let extension = wide(std::ffi::OsStr::new(&format!(".{extension}")));
        let preview_iid = wide(std::ffi::OsStr::new(
            "{8895b1c6-b41f-4c1c-a562-0d564250836f}",
        ));
        let mut clsid = [0u16; 64];
        let mut length = clsid.len() as u32;
        unsafe {
            AssocQueryStringW(
                ASSOCF_INIT_DEFAULTTOSTAR,
                ASSOCSTR_SHELLEXTENSION,
                PCWSTR(extension.as_ptr()),
                PCWSTR(preview_iid.as_ptr()),
                Some(PWSTR(clsid.as_mut_ptr())),
                &mut length,
            )
            .ok()
            .map_err(|_| host_unavailable())?;
            CLSIDFromString(PCWSTR(clsid.as_ptr())).map_err(|_| host_unavailable())
        }
    }

    fn wide(value: &std::ffi::OsStr) -> Vec<u16> {
        value.encode_wide().chain(Some(0)).collect()
    }

    fn rectangle(viewport: PreviewViewport) -> RECT {
        RECT {
            left: viewport.x,
            top: viewport.y,
            right: viewport.x.saturating_add(viewport.width),
            bottom: viewport.y.saturating_add(viewport.height),
        }
    }
}

#[cfg(target_os = "windows")]
use system_backend::SystemPreviewBackend;

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use tempfile::TempDir;

    use super::*;

    #[derive(Clone)]
    struct RecordingBackend {
        events: Arc<Mutex<Vec<String>>>,
    }

    impl PreviewBackend for RecordingBackend {
        fn start(
            &mut self,
            path: &Path,
            _parent_window: isize,
            _viewport: PreviewViewport,
        ) -> Result<(), DomainError> {
            self.events.lock().unwrap().push(format!(
                "start:{}",
                path.extension().unwrap().to_string_lossy()
            ));
            Ok(())
        }

        fn resize(&mut self, viewport: PreviewViewport) -> Result<(), DomainError> {
            self.events
                .lock()
                .unwrap()
                .push(format!("resize:{}x{}", viewport.width, viewport.height));
            Ok(())
        }

        fn unload(&mut self) -> Result<(), DomainError> {
            self.events.lock().unwrap().push("unload".into());
            Ok(())
        }
    }

    fn viewport() -> PreviewViewport {
        PreviewViewport {
            x: 0,
            y: 0,
            width: 640,
            height: 480,
        }
    }

    fn legacy_file(directory: &TempDir, extension: &str) -> PathBuf {
        let path = directory.path().join(format!("Preview.{extension}"));
        std::fs::write(&path, b"legacy").unwrap();
        path
    }

    #[test]
    fn switching_native_previews_unloads_the_previous_handler() {
        let events = Arc::new(Mutex::new(Vec::new()));
        let backend_events = events.clone();
        let host = WindowsPreviewHost::spawn(move || {
            Ok(RecordingBackend {
                events: backend_events,
            })
        });
        let directory = tempfile::tempdir().unwrap();

        let first = host
            .start(legacy_file(&directory, "doc"), 1, viewport())
            .unwrap();
        host.resize(
            &first,
            PreviewViewport {
                width: 800,
                height: 600,
                ..viewport()
            },
        )
        .unwrap();
        let second = host
            .start(legacy_file(&directory, "xls"), 1, viewport())
            .unwrap();
        assert_eq!(
            host.resize(&first, viewport()).unwrap_err().code,
            ErrorCode::InvalidInput
        );
        host.unload(&second).unwrap();

        assert_eq!(
            *events.lock().unwrap(),
            [
                "start:doc",
                "resize:800x600",
                "unload",
                "start:xls",
                "unload"
            ]
        );
    }

    #[test]
    fn invalid_format_and_viewport_never_reach_the_backend() {
        let events = Arc::new(Mutex::new(Vec::new()));
        let backend_events = events.clone();
        let host = WindowsPreviewHost::spawn(move || {
            Ok(RecordingBackend {
                events: backend_events,
            })
        });
        let directory = tempfile::tempdir().unwrap();
        assert_eq!(
            host.start(legacy_file(&directory, "pdf"), 1, viewport())
                .unwrap_err()
                .code,
            ErrorCode::InvalidInput
        );
        assert_eq!(
            host.start(
                legacy_file(&directory, "ppt"),
                1,
                PreviewViewport {
                    width: 0,
                    ..viewport()
                },
            )
            .unwrap_err()
            .code,
            ErrorCode::InvalidInput
        );
        assert!(events.lock().unwrap().is_empty());
    }

    #[test]
    fn unavailable_preview_handler_rejects_requests_without_an_active_session() {
        let host = WindowsPreviewHost::spawn(|| Err::<RecordingBackend, _>(host_unavailable()));
        let directory = tempfile::tempdir().unwrap();

        assert_eq!(
            host.start(legacy_file(&directory, "doc"), 1, viewport())
                .unwrap_err()
                .code,
            ErrorCode::FileSystemError
        );
        assert_eq!(
            host.resize("missing-session", viewport()).unwrap_err().code,
            ErrorCode::FileSystemError
        );
    }
}
