import Foundation
import ScreenCaptureKit
import AVFoundation
import CoreMedia

/// The main capture engine using ScreenCaptureKit.
@available(macOS 14.0, *)
public final class CaptureEngine: NSObject, SCStreamDelegate, SCStreamOutput {
    
    public enum CaptureState: String {
        case idle, preparing, recording, paused, stopping
    }
    
    public enum CaptureTarget {
        case fullDisplay(displayID: CGDirectDisplayID)
        case window(windowID: CGWindowID)
        case area(rect: CGRect, displayID: CGDirectDisplayID)
    }
    
    public struct CaptureConfig {
        public let target: CaptureTarget
        public let captureMicrophone: Bool
        public let captureSystemAudio: Bool
        public let captureCamera: Bool
        public let outputDirectory: URL
        public let fps: Int
        
        public init(
            target: CaptureTarget,
            captureMicrophone: Bool = true,
            captureSystemAudio: Bool = true,
            captureCamera: Bool = false,
            outputDirectory: URL,
            fps: Int = 60
        ) {
            self.target = target
            self.captureMicrophone = captureMicrophone
            self.captureSystemAudio = captureSystemAudio
            self.captureCamera = captureCamera
            self.outputDirectory = outputDirectory
            self.fps = fps
        }
    }
    
    public private(set) var state: CaptureState = .idle
    private var config: CaptureConfig?
    private var stream: SCStream?
    private var startTime: Date?
    private var pauseStartTime: Date?
    private var totalPauseDuration: TimeInterval = 0
    
    // Writers
    private var videoWriter: AVAssetWriter?
    private var videoInput: AVAssetWriterInput?
    private var audioInput: AVAssetWriterInput?
    private var hasStartedWriting = false
    
    // Mic recorder
    private var micRecorder: MicrophoneRecorder?
    private var cameraRecorder: CameraRecorder?
    
    // Output paths
    private var screenVideoPath: URL?
    private var micAudioPath: URL?
    private var systemAudioPath: URL?
    private var cameraVideoPath: URL?
    
    public var elapsedMs: UInt64 {
        guard let start = startTime else { return 0 }
        let elapsed = Date().timeIntervalSince(start) - totalPauseDuration
        if state == .paused, let pauseStart = pauseStartTime {
            return UInt64(max(0, (elapsed - Date().timeIntervalSince(pauseStart))) * 1000)
        }
        return UInt64(max(0, elapsed) * 1000)
    }
    
    public override init() {
        super.init()
    }
    
    public func startCapture(config: CaptureConfig) async throws {
        guard state == .idle else {
            throw CaptureError.invalidState("Cannot start capture in state: \(state)")
        }
        
        self.config = config
        state = .preparing
        totalPauseDuration = 0
        hasStartedWriting = false
        
        // Get shareable content
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false)
        
        // Set up filter based on target
        let filter: SCContentFilter
        switch config.target {
        case .fullDisplay(let displayID):
            guard let display = content.displays.first(where: { $0.displayID == displayID }) else {
                throw CaptureError.deviceNotFound("Display \(displayID) not found")
            }
            filter = SCContentFilter(display: display, excludingWindows: [])
            
        case .window(let windowID):
            guard let window = content.windows.first(where: { $0.windowID == windowID }) else {
                throw CaptureError.deviceNotFound("Window \(windowID) not found")
            }
            filter = SCContentFilter(desktopIndependentWindow: window)
            
        case .area(let rect, let displayID):
            guard let display = content.displays.first(where: { $0.displayID == displayID }) else {
                throw CaptureError.deviceNotFound("Display \(displayID) not found")
            }
            filter = SCContentFilter(display: display, excludingWindows: [])
            // Note: area cropping is handled via streamConfiguration.sourceRect
        }
        
        // Stream configuration
        let streamConfig = SCStreamConfiguration()
        
        // Video settings
        let scale: Int
        switch config.target {
        case .fullDisplay(let displayID):
            let mode = CGDisplayCopyDisplayMode(displayID)
            let w = mode?.pixelWidth ?? Int(CGDisplayPixelsWide(displayID))
            let h = mode?.pixelHeight ?? Int(CGDisplayPixelsHigh(displayID))
            streamConfig.width = w
            streamConfig.height = h
            scale = (mode?.pixelWidth ?? w) > Int(CGDisplayPixelsWide(displayID)) ? 2 : 1
        case .window:
            streamConfig.width = 1920
            streamConfig.height = 1080
            scale = 2
        case .area(let rect, _):
            streamConfig.width = Int(rect.width) * 2
            streamConfig.height = Int(rect.height) * 2
            streamConfig.sourceRect = rect
            scale = 2
        }
        
        streamConfig.minimumFrameInterval = CMTime(value: 1, timescale: CMTimeScale(config.fps))
        streamConfig.pixelFormat = kCVPixelFormatType_32BGRA
        streamConfig.showsCursor = true
        streamConfig.capturesAudio = config.captureSystemAudio
        streamConfig.queueDepth = 6
        
        // Set up screen video writer
        screenVideoPath = config.outputDirectory.appendingPathComponent("screen.mov")
        try setupVideoWriter(at: screenVideoPath!, width: streamConfig.width, height: streamConfig.height, fps: config.fps)
        
        // Create and start stream
        let scStream = SCStream(filter: filter, configuration: streamConfig, delegate: self)
        try scStream.addStreamOutput(self, type: .screen, sampleHandlerQueue: DispatchQueue(label: "com.screencraft.screen", qos: .userInteractive))
        
        if config.captureSystemAudio {
            try scStream.addStreamOutput(self, type: .audio, sampleHandlerQueue: DispatchQueue(label: "com.screencraft.audio", qos: .userInteractive))
        }
        
        self.stream = scStream
        
        // Start mic recording
        if config.captureMicrophone {
            micAudioPath = config.outputDirectory.appendingPathComponent("mic.m4a")
            micRecorder = MicrophoneRecorder()
            try micRecorder?.startRecording(to: micAudioPath!)
        }
        
        // Start camera recording
        if config.captureCamera {
            cameraVideoPath = config.outputDirectory.appendingPathComponent("camera.mov")
            cameraRecorder = CameraRecorder()
            try cameraRecorder?.startRecording(to: cameraVideoPath!)
        }
        
        try await scStream.startCapture()
        
        startTime = Date()
        state = .recording
    }
    
    public func pauseCapture() throws {
        guard state == .recording else {
            throw CaptureError.invalidState("Cannot pause in state: \(state)")
        }
        pauseStartTime = Date()
        micRecorder?.pause()
        cameraRecorder?.pause()
        state = .paused
    }
    
    public func resumeCapture() throws {
        guard state == .paused else {
            throw CaptureError.invalidState("Cannot resume in state: \(state)")
        }
        if let pauseStart = pauseStartTime {
            totalPauseDuration += Date().timeIntervalSince(pauseStart)
        }
        pauseStartTime = nil
        micRecorder?.resume()
        cameraRecorder?.resume()
        state = .recording
    }
    
    public func stopCapture() async throws -> CaptureResult {
        guard state == .recording || state == .paused else {
            throw CaptureError.invalidState("Cannot stop in state: \(state)")
        }
        
        state = .stopping
        
        // Stop stream
        if let stream = self.stream {
            try await stream.stopCapture()
        }
        
        // Stop mic
        micRecorder?.stopRecording()
        
        // Stop camera
        cameraRecorder?.stopRecording()
        
        // Finalize video writer
        await finalizeVideoWriter()
        
        let duration = elapsedMs
        
        state = .idle
        stream = nil
        
        return CaptureResult(
            screenVideoPath: screenVideoPath,
            cameraVideoPath: config?.captureCamera == true ? cameraVideoPath : nil,
            micAudioPath: config?.captureMicrophone == true ? micAudioPath : nil,
            systemAudioPath: nil, // System audio is muxed into screen.mov by ScreenCaptureKit
            durationMs: duration,
            metadata: [:]
        )
    }
    
    // MARK: - Video Writer
    
    private func setupVideoWriter(at url: URL, width: Int, height: Int, fps: Int) throws {
        // Remove existing file
        try? FileManager.default.removeItem(at: url)
        
        let writer = try AVAssetWriter(url: url, fileType: .mov)
        
        let videoSettings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: width,
            AVVideoHeightKey: height,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: width * height * 4,
                AVVideoMaxKeyFrameIntervalKey: fps * 2,
                AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
            ] as [String: Any],
        ]
        
        let vInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
        vInput.expectsMediaDataInRealTime = true
        writer.add(vInput)
        
        // Audio input for system audio
        let audioSettings: [String: Any] = [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVSampleRateKey: 48000,
            AVNumberOfChannelsKey: 2,
            AVEncoderBitRateKey: 192000,
        ]
        let aInput = AVAssetWriterInput(mediaType: .audio, outputSettings: audioSettings)
        aInput.expectsMediaDataInRealTime = true
        writer.add(aInput)
        
        self.videoWriter = writer
        self.videoInput = vInput
        self.audioInput = aInput
    }
    
    private func finalizeVideoWriter() async {
        guard let writer = videoWriter else { return }
        
        videoInput?.markAsFinished()
        audioInput?.markAsFinished()
        
        await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
            writer.finishWriting {
                cont.resume()
            }
        }
    }
    
    // MARK: - SCStreamOutput
    
    public func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard state == .recording else { return }
        guard CMSampleBufferDataIsReady(sampleBuffer) else { return }
        
        guard let writer = videoWriter else { return }
        
        if !hasStartedWriting {
            writer.startWriting()
            writer.startSession(atSourceTime: CMSampleBufferGetPresentationTimeStamp(sampleBuffer))
            hasStartedWriting = true
        }
        
        switch type {
        case .screen:
            if let input = videoInput, input.isReadyForMoreMediaData {
                input.append(sampleBuffer)
            }
        case .audio:
            if let input = audioInput, input.isReadyForMoreMediaData {
                input.append(sampleBuffer)
            }
        @unknown default:
            break
        }
    }
    
    // MARK: - SCStreamDelegate
    
    public func stream(_ stream: SCStream, didStopWithError error: Error) {
        fputs("[SwiftCapture] Stream stopped with error: \(error.localizedDescription)\n", stderr)
    }
}

/// Result of a completed capture session.
public struct CaptureResult {
    public let screenVideoPath: URL?
    public let cameraVideoPath: URL?
    public let micAudioPath: URL?
    public let systemAudioPath: URL?
    public let durationMs: UInt64
    public let metadata: [String: String]
}

/// Capture errors.
public enum CaptureError: Error, LocalizedError {
    case invalidState(String)
    case permissionDenied
    case deviceNotFound(String)
    case encodingFailed(String)
    case ioError(String)
    
    public var errorDescription: String? {
        switch self {
        case .invalidState(let msg): return "Invalid state: \(msg)"
        case .permissionDenied: return "Screen recording permission denied"
        case .deviceNotFound(let msg): return "Device not found: \(msg)"
        case .encodingFailed(let msg): return "Encoding failed: \(msg)"
        case .ioError(let msg): return "IO error: \(msg)"
        }
    }
}
