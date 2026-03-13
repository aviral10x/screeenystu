import Foundation

/// C-compatible types for the Swift ↔ Rust FFI boundary.
/// Data crosses as C strings (JSON) or simple structs.

/// Result type for FFI calls.
@frozen
public struct FFIResult {
    public let success: Bool
    public let json: UnsafeMutablePointer<CChar>?
    public let error: UnsafeMutablePointer<CChar>?
}

/// Helper to create a C string from a Swift string.
/// The caller is responsible for freeing the memory.
public func makeCString(_ string: String) -> UnsafeMutablePointer<CChar> {
    let count = string.utf8.count + 1
    let pointer = UnsafeMutablePointer<CChar>.allocate(capacity: count)
    string.withCString { source in
        pointer.initialize(from: source, count: count)
    }
    return pointer
}

/// Free a C string previously created by makeCString.
public func freeCString(_ pointer: UnsafeMutablePointer<CChar>?) {
    pointer?.deallocate()
}
