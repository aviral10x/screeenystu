import Foundation
import CoreGraphics
import SwiftCapture

/// ScreenCraft Capture CLI
/// Usage:
///   screencraft-capture start --config '<json>'
///   screencraft-capture list-displays
///   screencraft-capture list-windows
///   screencraft-capture list-mics
///   screencraft-capture list-cameras
@main
@available(macOS 14.0, *)
struct CaptureApp {
    static func main() async {
        let args = CommandLine.arguments
        
        guard args.count >= 2 else {
            emitError("Usage: screencraft-capture <command> [options]")
            Foundation.exit(1)
        }
        
        let command = args[1]
        
        do {
            switch command {
            case "start":
                try await handleStart(args: Array(args.dropFirst(2)))
            case "list-displays":
                try await handleListDisplays()
            case "list-windows":
                try await handleListWindows()
            case "list-mics":
                handleListMics()
            case "list-cameras":
                handleListCameras()
            case "check-permissions":
                handleCheckPermissions()
            case "request-permission":
                let typeIdx = args.firstIndex(of: "request-permission")! + 1
                if typeIdx < args.count {
                    let pType = args[typeIdx]
                    handleRequestPermission(type: pType)
                } else {
                    emitError("Missing permission type (screen/camera/microphone/accessibility)")
                    Foundation.exit(1)
                }
            default:
                emitError("Unknown command: \(command)")
                Foundation.exit(1)
            }
        } catch {
            emitError("Command failed: \(error.localizedDescription)")
            Foundation.exit(1)
        }
    }
    
    // MARK: - Start Recording
    
    static func handleStart(args: [String]) async throws {
        // Parse --config flag
        guard let configIdx = args.firstIndex(of: "--config"),
              configIdx + 1 < args.count else {
            emitError("Missing --config argument")
            Foundation.exit(1)
        }
        
        let configJSON = args[configIdx + 1]
        guard let configData = configJSON.data(using: .utf8),
              let config = try? JSONSerialization.jsonObject(with: configData) as? [String: Any] else {
            emitError("Invalid config JSON")
            Foundation.exit(1)
        }
        
        let captureConfig = try parseCaptureConfig(config)
        
        // Create output directory
        try FileManager.default.createDirectory(
            at: captureConfig.outputDirectory,
            withIntermediateDirectories: true
        )
        
        emitEvent("ready", data: [:])
        
        let engine = CaptureEngine()
        let interactionTracker = InteractionTracker(outputDirectory: captureConfig.outputDirectory)
        
        // Start interaction tracking
        interactionTracker.start()
        
        // Start capture
        try await engine.startCapture(config: captureConfig)
        
        emitEvent("started", data: [
            "output_dir": captureConfig.outputDirectory.path
        ])
        
        // Listen for stdin commands
        let stdinTask = Task {
            while let line = readLine() {
                let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
                if trimmed.isEmpty { continue }
                
                let parts = trimmed.split(separator: " ", maxSplits: 1)
                let cmd = String(parts[0])
                let arg = parts.count > 1 ? String(parts[1]) : nil
                
                switch cmd {
                case "pause":
                    try? engine.pauseCapture()
                    emitEvent("paused", data: [:])
                case "resume":
                    try? engine.resumeCapture()
                    emitEvent("resumed", data: [:])
                case "stop":
                    let result = try await engine.stopCapture()
                    interactionTracker.stop()
                    
                    var files: [String: String] = [:]
                    if let p = result.screenVideoPath { files["screen"] = p.lastPathComponent }
                    if let p = result.micAudioPath { files["mic"] = p.lastPathComponent }
                    if let p = result.systemAudioPath { files["system_audio"] = p.lastPathComponent }
                    if let p = result.cameraVideoPath { files["camera"] = p.lastPathComponent }
                    files["metadata"] = "metadata.json"
                    
                    emitEvent("stopped", data: [
                        "duration_ms": result.durationMs,
                        "files": files
                    ] as [String: Any])
                    
                    Foundation.exit(0)
                case "flag":
                    let elapsed = engine.elapsedMs
                    emitEvent("flag", data: [
                        "timestamp_ms": elapsed,
                        "label": arg ?? ""
                    ] as [String: Any])
                default:
                    emitError("Unknown command: \(cmd)")
                }
            }
        }
        
        // Progress reporting
        let progressTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
                if engine.state == .recording || engine.state == .paused {
                    emitEvent("progress", data: [
                        "elapsed_ms": engine.elapsedMs,
                        "state": engine.state == .paused ? "paused" : "recording"
                    ] as [String: Any])
                }
            }
        }
        
        // Wait for stdin task (blocks until "stop" or EOF)
        try await stdinTask.value
        progressTask.cancel()
    }
    
    // MARK: - List Sources
    
    static func handleListDisplays() async throws {
        let displays = try await ScreenEnumerator.availableDisplays()
        let result = displays.map { d in
            ["id": d.displayID, "width": d.width, "height": d.height, "is_main": d.isMain] as [String: Any]
        }
        printJSON(["displays": result])
    }
    
    static func handleListWindows() async throws {
        let windows = try await ScreenEnumerator.availableWindows(onScreenOnly: true)
        let result = windows.map { w in
            [
                "window_id": w.windowID,
                "title": w.title ?? "",
                "app_name": w.appName ?? "",
                "bundle_id": w.bundleID ?? "",
                "x": w.frame.origin.x,
                "y": w.frame.origin.y,
                "width": w.frame.size.width,
                "height": w.frame.size.height,
                "is_on_screen": w.isOnScreen,
            ] as [String: Any]
        }
        printJSON(["windows": result])
    }
    
    static func handleListMics() {
        let devices = AudioDeviceManager.inputDevices()
        let result = devices.map { d in
            ["id": d.id, "name": d.name, "uid": d.uid] as [String: Any]
        }
        printJSON(["devices": result])
    }
    
    static func handleListCameras() {
        let cameras = CameraRecorder.availableCameras()
        let result = cameras.map { c in
            ["id": c.uniqueID, "name": c.localizedName] as [String: Any]
        }
        printJSON(["cameras": result])
    }
    
    // MARK: - Permissions
    
    static func handleCheckPermissions() {
        let perms = PermissionsManager.checkPermissions()
        printJSON(["permissions": perms])
    }
    
    static func handleRequestPermission(type: String) {
        PermissionsManager.requestPermission(type: type)
        handleCheckPermissions()
    }
    
    // MARK: - Config Parsing
    
    static func parseCaptureConfig(_ json: [String: Any]) throws -> CaptureEngine.CaptureConfig {
        guard let targetDict = json["target"] as? [String: Any],
              let targetType = targetDict["type"] as? String else {
            throw CaptureError.invalidState("Missing target in config")
        }
        
        let target: CaptureEngine.CaptureTarget
        switch targetType {
        case "FullDisplay":
            let displayId = targetDict["display_id"] as? UInt32 ?? CGMainDisplayID()
            target = .fullDisplay(displayID: CGDirectDisplayID(displayId))
        case "Window":
            let windowId = targetDict["window_id"] as? UInt32 ?? 0
            target = .window(windowID: CGWindowID(windowId))
        case "Area":
            let x = targetDict["x"] as? Double ?? 0
            let y = targetDict["y"] as? Double ?? 0
            let w = targetDict["width"] as? Double ?? 800
            let h = targetDict["height"] as? Double ?? 600
            let displayId = targetDict["display_id"] as? UInt32 ?? CGMainDisplayID()
            target = .area(rect: CGRect(x: x, y: y, width: w, height: h), displayID: CGDirectDisplayID(displayId))
        default:
            throw CaptureError.invalidState("Unknown target type: \(targetType)")
        }
        
        let outputDir: URL
        if let dir = json["output_dir"] as? String {
            outputDir = URL(fileURLWithPath: dir)
        } else {
            outputDir = FileManager.default.temporaryDirectory
                .appendingPathComponent("screencraft_\(ProcessInfo.processInfo.globallyUniqueString)")
        }
        
        return CaptureEngine.CaptureConfig(
            target: target,
            captureMicrophone: json["mic_enabled"] as? Bool ?? true,
            captureSystemAudio: json["system_audio_enabled"] as? Bool ?? true,
            captureCamera: json["camera_enabled"] as? Bool ?? false,
            outputDirectory: outputDir,
            fps: json["fps"] as? Int ?? 60
        )
    }
    
    // MARK: - Output Helpers
    
    static func emitEvent(_ event: String, data: [String: Any]) {
        var dict = data
        dict["event"] = event
        dict["timestamp"] = Int(Date().timeIntervalSince1970 * 1000)
        printJSON(dict)
    }
    
    static func emitError(_ message: String) {
        printJSON(["event": "error", "message": message])
    }
    
    static func printJSON(_ obj: Any) {
        if let data = try? JSONSerialization.data(withJSONObject: obj),
           let str = String(data: data, encoding: .utf8) {
            print(str)
            fflush(stdout)
        }
    }
}
