// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SwiftCapture",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "SwiftCapture",
            type: .static,
            targets: ["SwiftCapture"]
        ),
        .executable(
            name: "screencraft-capture",
            targets: ["CaptureApp"]
        ),
    ],
    targets: [
        .target(
            name: "SwiftCapture",
            path: "Sources/SwiftCapture",
            linkerSettings: [
                .linkedFramework("ScreenCaptureKit"),
                .linkedFramework("AVFoundation"),
                .linkedFramework("CoreAudio"),
                .linkedFramework("CoreMedia"),
                .linkedFramework("CoreGraphics"),
            ]
        ),
        .executableTarget(
            name: "CaptureApp",
            dependencies: ["SwiftCapture"],
            path: "Sources/CaptureApp"
        ),
        .testTarget(
            name: "SwiftCaptureTests",
            dependencies: ["SwiftCapture"],
            path: "Tests/SwiftCaptureTests"
        ),
    ]
)
