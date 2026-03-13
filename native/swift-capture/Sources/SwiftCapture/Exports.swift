import Foundation

/// C-exported functions for Rust FFI.
/// These are the functions that Rust calls via extern "C".

/// List available displays as JSON.
@_cdecl("swift_capture_list_displays")
public func listDisplays() -> UnsafeMutablePointer<CChar> {
    // Phase 1: Use ScreenEnumerator.availableDisplays()
    let stub = """
    {"displays": [{"id": 1, "width": 2560, "height": 1440, "is_main": true}]}
    """
    return makeCString(stub)
}

/// List available windows as JSON.
@_cdecl("swift_capture_list_windows")
public func listWindows() -> UnsafeMutablePointer<CChar> {
    // Phase 1: Use ScreenEnumerator.availableWindows()
    let stub = """
    {"windows": []}
    """
    return makeCString(stub)
}

/// List available audio input devices as JSON.
@_cdecl("swift_capture_list_audio_devices")
public func listAudioDevices() -> UnsafeMutablePointer<CChar> {
    let devices = AudioDeviceManager.inputDevices()
    let deviceDicts = devices.map { device in
        ["id": "\(device.id)", "name": device.name, "uid": device.uid]
    }
    
    if let data = try? JSONSerialization.data(withJSONObject: ["devices": deviceDicts]),
       let json = String(data: data, encoding: .utf8) {
        return makeCString(json)
    }
    
    return makeCString("{\"devices\": []}")
}

/// Free a string previously returned by a swift_capture_ function.
@_cdecl("swift_capture_free_string")
public func freeString(_ ptr: UnsafeMutablePointer<CChar>?) {
    freeCString(ptr)
}

/// Start a capture session with JSON config.
@_cdecl("swift_capture_start")
public func startCapture(_ configJson: UnsafePointer<CChar>) -> UnsafeMutablePointer<CChar> {
    let config = String(cString: configJson)
    print("[SwiftCapture FFI] start_capture called with: \(config)")
    return makeCString("{\"status\": \"stub\", \"message\": \"Not yet implemented\"}")
}

/// Stop the current capture session.
@_cdecl("swift_capture_stop")
public func stopCapture() -> UnsafeMutablePointer<CChar> {
    print("[SwiftCapture FFI] stop_capture called")
    return makeCString("{\"status\": \"stub\", \"message\": \"Not yet implemented\"}")
}
