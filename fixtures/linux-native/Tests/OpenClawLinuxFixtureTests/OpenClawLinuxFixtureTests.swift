import XCTest
@testable import OpenClawLinuxFixture

final class OpenClawLinuxFixtureTests: XCTestCase {
    func testMarkerIsStable() {
        let fixture = OpenClawLinuxFixture()
        XCTAssertEqual(fixture.toolchainMarker(), "linux-fixture-ready")
    }
}
