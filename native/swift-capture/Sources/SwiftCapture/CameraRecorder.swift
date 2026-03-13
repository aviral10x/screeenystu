import Foundation
import AVFoundation

/// Records webcam video to a MOV file.
public final class CameraRecorder: NSObject {
    
    private var session: AVCaptureSession?
    private var movieOutput: AVCaptureMovieFileOutput?
    private var isPaused = false
    private var outputURL: URL?
    
    public override init() {
        super.init()
    }
    
    /// List available camera devices.
    public static func availableCameras() -> [AVCaptureDevice] {
        let discoverySession = AVCaptureDevice.DiscoverySession(
            deviceTypes: [.builtInWideAngleCamera, .external],
            mediaType: .video,
            position: .unspecified
        )
        return discoverySession.devices
    }
    
    public func startRecording(to url: URL, cameraID: String? = nil) throws {
        let session = AVCaptureSession()
        session.sessionPreset = .high
        
        // Find camera
        let camera: AVCaptureDevice?
        if let id = cameraID {
            camera = AVCaptureDevice(uniqueID: id)
        } else {
            camera = AVCaptureDevice.default(for: .video)
        }
        
        guard let device = camera else {
            throw CaptureError.deviceNotFound("No camera found")
        }
        
        let input = try AVCaptureDeviceInput(device: device)
        guard session.canAddInput(input) else {
            throw CaptureError.deviceNotFound("Cannot add camera input")
        }
        session.addInput(input)
        
        let output = AVCaptureMovieFileOutput()
        guard session.canAddOutput(output) else {
            throw CaptureError.encodingFailed("Cannot add movie output")
        }
        session.addOutput(output)
        
        self.session = session
        self.movieOutput = output
        self.outputURL = url
        
        // Remove existing file
        try? FileManager.default.removeItem(at: url)
        
        session.startRunning()
        output.startRecording(to: url, recordingDelegate: self)
    }
    
    public func pause() {
        movieOutput?.pauseRecording()
        isPaused = true
    }
    
    public func resume() {
        movieOutput?.resumeRecording()
        isPaused = false
    }
    
    public func stopRecording() {
        movieOutput?.stopRecording()
        session?.stopRunning()
        session = nil
    }
}

extension CameraRecorder: AVCaptureFileOutputRecordingDelegate {
    public func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo outputFileURL: URL, from connections: [AVCaptureConnection], error: Error?) {
        if let error = error {
            fputs("[SwiftCapture] Camera recording error: \(error.localizedDescription)\n", stderr)
        }
    }
}
