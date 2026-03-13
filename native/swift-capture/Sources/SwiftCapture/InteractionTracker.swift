import Foundation
import CoreGraphics

/// Tracks cursor position, mouse clicks, keyboard events, and scroll events
/// during a recording session using CGEvent taps.
public final class InteractionTracker {
    
    private let outputDirectory: URL
    private var eventTap: CFMachPort?
    private var runLoopSource: CFRunLoopSource?
    private var trackingQueue = DispatchQueue(label: "com.screencraft.interaction", qos: .utility)
    
    private var cursorPoints: [[String: Any]] = []
    private var clickEvents: [[String: Any]] = []
    private var keyboardEvents: [[String: Any]] = []
    private var scrollEvents: [[String: Any]] = []
    
    private var startTime: Date?
    private var cursorTimer: DispatchSourceTimer?
    
    // Keyboard state for shortcut detection
    private var activeModifiers: Set<String> = []
    
    public init(outputDirectory: URL) {
        self.outputDirectory = outputDirectory
    }
    
    public func start() {
        startTime = Date()
        
        // Start cursor position polling (60 Hz)
        let timer = DispatchSource.makeTimerSource(queue: trackingQueue)
        timer.schedule(deadline: .now(), repeating: .milliseconds(16))
        timer.setEventHandler { [weak self] in
            self?.sampleCursorPosition()
        }
        timer.resume()
        cursorTimer = timer
        
        // Set up CGEvent tap for clicks, keyboard, scroll
        setupEventTap()
    }
    
    public func stop() {
        cursorTimer?.cancel()
        cursorTimer = nil
        
        if let source = runLoopSource {
            CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes)
        }
        if let tap = eventTap {
            CGEvent.tapEnable(tap: tap, enable: false)
        }
        eventTap = nil
        runLoopSource = nil
        
        // Write metadata to file
        saveMetadata()
    }
    
    private func sampleCursorPosition() {
        let location = CGEvent(source: nil)?.location ?? .zero
        let timestamp = timestampMs()
        
        cursorPoints.append([
            "timestamp_ms": timestamp,
            "x": location.x,
            "y": location.y,
            "visible": true,
        ])
    }
    
    private func setupEventTap() {
        let eventMask: CGEventMask = (
            (1 << CGEventType.leftMouseDown.rawValue) |
            (1 << CGEventType.rightMouseDown.rawValue) |
            (1 << CGEventType.otherMouseDown.rawValue) |
            (1 << CGEventType.scrollWheel.rawValue) |
            (1 << CGEventType.keyDown.rawValue) |
            (1 << CGEventType.flagsChanged.rawValue)
        )
        
        let callback: CGEventTapCallBack = { proxy, type, event, refcon in
            guard let refcon = refcon else { return Unmanaged.passRetained(event) }
            let tracker = Unmanaged<InteractionTracker>.fromOpaque(refcon).takeUnretainedValue()
            tracker.handleEvent(type: type, event: event)
            return Unmanaged.passRetained(event)
        }
        
        let refcon = Unmanaged.passUnretained(self).toOpaque()
        
        guard let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .tailAppendEventTap,
            options: .listenOnly,
            eventsOfInterest: eventMask,
            callback: callback,
            userInfo: refcon
        ) else {
            fputs("[SwiftCapture] Failed to create event tap. Accessibility permission may be needed.\n", stderr)
            return
        }
        
        self.eventTap = tap
        let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
        self.runLoopSource = source
        CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
        CGEvent.tapEnable(tap: tap, enable: true)
    }
    
    private func handleEvent(type: CGEventType, event: CGEvent) {
        let timestamp = timestampMs()
        let location = event.location
        
        switch type {
        case .leftMouseDown, .rightMouseDown, .otherMouseDown:
            let button: String
            switch type {
            case .leftMouseDown: button = "Left"
            case .rightMouseDown: button = "Right"
            default: button = "Middle"
            }
            
            let clickCount = event.getIntegerValueField(.mouseEventClickState)
            let clickType: String
            switch clickCount {
            case 2: clickType = "Double"
            case 3: clickType = "Triple"
            default: clickType = "Single"
            }
            
            trackingQueue.async {
                self.clickEvents.append([
                    "timestamp_ms": timestamp,
                    "x": location.x,
                    "y": location.y,
                    "button": button,
                    "click_type": clickType,
                ])
            }
            
        case .scrollWheel:
            let deltaX = event.getDoubleValueField(.scrollWheelEventDeltaAxis2)
            let deltaY = event.getDoubleValueField(.scrollWheelEventDeltaAxis1)
            
            trackingQueue.async {
                self.scrollEvents.append([
                    "timestamp_ms": timestamp,
                    "x": location.x,
                    "y": location.y,
                    "delta_x": deltaX,
                    "delta_y": deltaY,
                ])
            }
            
        case .keyDown:
            let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
            let flags = event.flags
            
            var modifiers: [String] = []
            if flags.contains(.maskCommand) { modifiers.append("Command") }
            if flags.contains(.maskShift) { modifiers.append("Shift") }
            if flags.contains(.maskAlternate) { modifiers.append("Option") }
            if flags.contains(.maskControl) { modifiers.append("Control") }
            
            let isShortcut = !modifiers.isEmpty
            let keyName = keyCodeToString(Int(keyCode))
            
            var displayLabel: String? = nil
            if isShortcut {
                var parts: [String] = []
                if flags.contains(.maskCommand) { parts.append("⌘") }
                if flags.contains(.maskShift) { parts.append("⇧") }
                if flags.contains(.maskAlternate) { parts.append("⌥") }
                if flags.contains(.maskControl) { parts.append("⌃") }
                parts.append(keyName.uppercased())
                displayLabel = parts.joined()
            }
            
            trackingQueue.async {
                self.keyboardEvents.append([
                    "timestamp_ms": timestamp,
                    "key": keyName,
                    "modifiers": modifiers,
                    "event_type": "KeyDown",
                    "is_shortcut": isShortcut,
                    "display_label": displayLabel ?? NSNull(),
                ])
            }
            
        default:
            break
        }
    }
    
    private func timestampMs() -> UInt64 {
        guard let start = startTime else { return 0 }
        return UInt64(Date().timeIntervalSince(start) * 1000)
    }
    
    private func saveMetadata() {
        let metadata: [String: Any] = [
            "cursor_points": cursorPoints,
            "click_events": clickEvents,
            "keyboard_events": keyboardEvents,
            "scroll_events": scrollEvents,
            "typing_segments": [],
            "active_app_changes": [],
        ]
        
        let outputURL = outputDirectory.appendingPathComponent("metadata.json")
        
        if let data = try? JSONSerialization.data(withJSONObject: metadata, options: [.sortedKeys]) {
            try? data.write(to: outputURL)
        }
    }
    
    private func keyCodeToString(_ keyCode: Int) -> String {
        let map: [Int: String] = [
            0: "a", 1: "s", 2: "d", 3: "f", 4: "h", 5: "g", 6: "z", 7: "x",
            8: "c", 9: "v", 11: "b", 12: "q", 13: "w", 14: "e", 15: "r",
            16: "y", 17: "t", 18: "1", 19: "2", 20: "3", 21: "4", 22: "6",
            23: "5", 24: "=", 25: "9", 26: "7", 27: "-", 28: "8", 29: "0",
            30: "]", 31: "o", 32: "u", 33: "[", 34: "i", 35: "p",
            36: "return", 37: "l", 38: "j", 39: "'", 40: "k", 41: ";",
            42: "\\", 43: ",", 44: "/", 45: "n", 46: "m", 47: ".",
            48: "tab", 49: "space", 50: "`", 51: "delete",
            53: "escape", 76: "enter",
            123: "left", 124: "right", 125: "down", 126: "up",
        ]
        return map[keyCode] ?? "key_\(keyCode)"
    }
}
