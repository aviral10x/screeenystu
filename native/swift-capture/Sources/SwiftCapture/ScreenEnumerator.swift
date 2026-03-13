import Foundation
import ScreenCaptureKit

/// Enumerates available displays and windows for recording target selection.
@available(macOS 14.0, *)
public final class ScreenEnumerator {
    
    public struct DisplayInfo {
        public let displayID: CGDirectDisplayID
        public let width: Int
        public let height: Int
        public let isMain: Bool
    }
    
    public struct WindowInfo {
        public let windowID: CGWindowID
        public let title: String?
        public let appName: String?
        public let bundleID: String?
        public let frame: CGRect
        public let isOnScreen: Bool
    }
    
    /// Get all available displays.
    public static func availableDisplays() async throws -> [DisplayInfo] {
        let content = try await SCShareableContent.excludingDesktopWindows(
            false,
            onScreenWindowsOnly: false
        )
        
        return content.displays.map { display in
            DisplayInfo(
                displayID: display.displayID,
                width: display.width,
                height: display.height,
                isMain: CGDisplayIsMain(display.displayID) != 0
            )
        }
    }
    
    /// Get all available windows, optionally filtered to on-screen only.
    public static func availableWindows(onScreenOnly: Bool = true) async throws -> [WindowInfo] {
        let content = try await SCShareableContent.excludingDesktopWindows(
            true,
            onScreenWindowsOnly: onScreenOnly
        )
        
        return content.windows.compactMap { window in
            guard let app = window.owningApplication else { return nil }
            return WindowInfo(
                windowID: window.windowID,
                title: window.title,
                appName: app.applicationName,
                bundleID: app.bundleIdentifier,
                frame: window.frame,
                isOnScreen: window.isOnScreen
            )
        }
    }
}
