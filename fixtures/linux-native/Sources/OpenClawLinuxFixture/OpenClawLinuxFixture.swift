import Logging
import SystemPackage

public struct OpenClawLinuxFixture {
    public init() {}

    public func toolchainMarker() -> String {
        let logger = Logger(label: "openclaw.linux-fixture")
        logger.debug("linux fixture loaded")
        return "linux-fixture-ready"
    }
}
