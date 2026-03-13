import Foundation
import CoreGraphics
import AVFoundation
import ApplicationServices

public class PermissionsManager {
    
    public static func checkPermissions() -> [String: Bool] {
        return [
            "screen": checkScreen(),
            "camera": checkCamera(),
            "microphone": checkMicrophone(),
            "accessibility": checkAccessibility()
        ]
    }
    
    public static func requestPermission(type: String) {
        switch type {
        case "screen":
            CGRequestScreenCaptureAccess()
        case "camera":
            AVCaptureDevice.requestAccess(for: .video) { _ in }
        case "microphone":
            AVCaptureDevice.requestAccess(for: .audio) { _ in }
        case "accessibility":
            let options: NSDictionary = [kAXTrustedCheckOptionPrompt.takeRetainedValue() as NSString: true]
            AXIsProcessTrustedWithOptions(options)
        default:
            break
        }
    }
    
    private static func checkScreen() -> Bool {
        return CGPreflightScreenCaptureAccess()
    }
    
    private static func checkCamera() -> Bool {
        return AVCaptureDevice.authorizationStatus(for: .video) == .authorized
    }
    
    private static func checkMicrophone() -> Bool {
        return AVCaptureDevice.authorizationStatus(for: .audio) == .authorized
    }
    
    private static func checkAccessibility() -> Bool {
        let options: NSDictionary = [kAXTrustedCheckOptionPrompt.takeRetainedValue() as NSString: false]
        return AXIsProcessTrustedWithOptions(options)
    }
}
