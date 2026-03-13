import Foundation
import AVFoundation
import CoreAudio

/// Manages audio input and output devices.
public final class AudioDeviceManager {
    
    public struct AudioDevice {
        public let id: AudioDeviceID
        public let uid: String
        public let name: String
        public let isInput: Bool
        public let isOutput: Bool
    }
    
    /// List all available audio input devices (microphones).
    public static func inputDevices() -> [AudioDevice] {
        return getDevices(scope: kAudioObjectPropertyScopeInput)
    }
    
    /// List all available audio output devices.
    public static func outputDevices() -> [AudioDevice] {
        return getDevices(scope: kAudioObjectPropertyScopeOutput)
    }
    
    /// Get the default input device.
    public static func defaultInputDevice() -> AudioDevice? {
        var deviceID = AudioDeviceID()
        var propertySize = UInt32(MemoryLayout<AudioDeviceID>.size)
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDefaultInputDevice,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        
        let status = AudioObjectGetPropertyData(
            AudioObjectID(kAudioObjectSystemObject),
            &address,
            0, nil,
            &propertySize,
            &deviceID
        )
        
        guard status == noErr else { return nil }
        return deviceInfo(for: deviceID)
    }
    
    private static func getDevices(scope: AudioObjectPropertyScope) -> [AudioDevice] {
        var propertySize: UInt32 = 0
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDevices,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        
        AudioObjectGetPropertyDataSize(
            AudioObjectID(kAudioObjectSystemObject),
            &address,
            0, nil,
            &propertySize
        )
        
        let deviceCount = Int(propertySize) / MemoryLayout<AudioDeviceID>.size
        var deviceIDs = [AudioDeviceID](repeating: 0, count: deviceCount)
        
        AudioObjectGetPropertyData(
            AudioObjectID(kAudioObjectSystemObject),
            &address,
            0, nil,
            &propertySize,
            &deviceIDs
        )
        
        return deviceIDs.compactMap { deviceInfo(for: $0) }
            .filter { scope == kAudioObjectPropertyScopeInput ? $0.isInput : $0.isOutput }
    }
    
    private static func deviceInfo(for deviceID: AudioDeviceID) -> AudioDevice? {
        // Get device name
        var name: CFString = "" as CFString
        var propertySize = UInt32(MemoryLayout<CFString>.size)
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioDevicePropertyDeviceNameCFString,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        
        AudioObjectGetPropertyData(deviceID, &address, 0, nil, &propertySize, &name)
        
        // Get device UID
        var uid: CFString = "" as CFString
        address.mSelector = kAudioDevicePropertyDeviceUID
        propertySize = UInt32(MemoryLayout<CFString>.size)
        AudioObjectGetPropertyData(deviceID, &address, 0, nil, &propertySize, &uid)
        
        // Check if input
        var inputSize: UInt32 = 0
        address.mSelector = kAudioDevicePropertyStreamConfiguration
        address.mScope = kAudioObjectPropertyScopeInput
        AudioObjectGetPropertyDataSize(deviceID, &address, 0, nil, &inputSize)
        let hasInput = inputSize > 0
        
        // Check if output
        var outputSize: UInt32 = 0
        address.mScope = kAudioObjectPropertyScopeOutput
        AudioObjectGetPropertyDataSize(deviceID, &address, 0, nil, &outputSize)
        let hasOutput = outputSize > 0
        
        return AudioDevice(
            id: deviceID,
            uid: uid as String,
            name: name as String,
            isInput: hasInput,
            isOutput: hasOutput
        )
    }
}
