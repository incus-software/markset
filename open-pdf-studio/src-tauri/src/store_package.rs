//! Markset: is this copy installed from the Microsoft Store (an MSIX
//! package)? The Store updates such a copy itself, so the app's own updater
//! stays off and Help > Check for Updates points to the Store instead.

/// True when the app runs from an MSIX package (Store install).
#[cfg(windows)]
pub fn is_store_package() -> bool {
    use std::sync::OnceLock;
    static AAN: OnceLock<bool> = OnceLock::new();
    *AAN.get_or_init(|| {
        #[link(name = "kernel32")]
        extern "system" {
            fn GetCurrentPackageFullName(length: *mut u32, name: *mut u16) -> i32;
        }
        // APPMODEL_ERROR_NO_PACKAGE: not packaged. A packaged process asks for
        // a bigger buffer (ERROR_INSUFFICIENT_BUFFER) when given none.
        const APPMODEL_ERROR_NO_PACKAGE: i32 = 15700;
        let mut length: u32 = 0;
        let rc = unsafe { GetCurrentPackageFullName(&mut length, std::ptr::null_mut()) };
        rc != APPMODEL_ERROR_NO_PACKAGE
    })
}

#[cfg(not(windows))]
pub fn is_store_package() -> bool {
    false
}

/// For the frontend: was this copy installed from the Microsoft Store?
#[tauri::command]
pub fn store_package() -> bool {
    is_store_package()
}

#[cfg(all(test, windows))]
mod tests {
    #[test]
    fn a_test_process_is_not_a_store_package() {
        assert!(!super::is_store_package());
    }
}
