import Foundation
import AVFoundation

/// Records microphone audio to an M4A file.
public final class MicrophoneRecorder {
    
    private var audioEngine: AVAudioEngine?
    private var audioFile: AVAudioFile?
    private var isPaused = false
    
    public init() {}
    
    public func startRecording(to url: URL) throws {
        let engine = AVAudioEngine()
        let inputNode = engine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        
        guard format.sampleRate > 0 else {
            throw CaptureError.deviceNotFound("No microphone available")
        }
        
        // Remove existing file
        try? FileManager.default.removeItem(at: url)
        
        // Create output file  
        let settings: [String: Any] = [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVSampleRateKey: format.sampleRate,
            AVNumberOfChannelsKey: format.channelCount,
            AVEncoderBitRateKey: 128000,
        ]
        
        let file = try AVAudioFile(forWriting: url, settings: settings)
        self.audioFile = file
        
        inputNode.installTap(onBus: 0, bufferSize: 4096, format: format) { [weak self] buffer, _ in
            guard let self = self, !self.isPaused else { return }
            try? self.audioFile?.write(from: buffer)
        }
        
        try engine.start()
        self.audioEngine = engine
    }
    
    public func pause() {
        isPaused = true
    }
    
    public func resume() {
        isPaused = false
    }
    
    public func stopRecording() {
        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine?.stop()
        audioEngine = nil
        audioFile = nil
    }
}
