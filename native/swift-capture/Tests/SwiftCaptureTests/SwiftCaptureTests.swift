import XCTest
@testable import SwiftCapture

final class SwiftCaptureTests: XCTestCase {
    
    func testBridgeTypesCStringRoundtrip() throws {
        let original = "Hello, World!"
        let cStr = makeCString(original)
        let result = String(cString: cStr)
        XCTAssertEqual(result, original)
        freeCString(cStr)
    }
    
    func testAudioDeviceManagerDoesNotCrash() throws {
        // Just verify it doesn't crash; actual devices vary by machine
        let inputs = AudioDeviceManager.inputDevices()
        let outputs = AudioDeviceManager.outputDevices()
        // No assertion on count since CI may have no audio devices
        XCTAssertNotNil(inputs)
        XCTAssertNotNil(outputs)
    }
    
    func testFFIExportsFreeString() throws {
        let ptr = makeCString("test")
        freeString(ptr)
        // If we got here without crash, test passes
    }
}
