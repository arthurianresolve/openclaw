import Foundation

enum OpenClawEnv {
    private static let dotenvURLs: [URL] = [
        URL(fileURLWithPath: "/data/.openclaw/.env"),
        FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".openclaw/.env"),
    ]
    private static let dotenvEnvironment: [String: String] = Self.loadDotEnv()

    static func path(_ key: String) -> String? {
        return self.string(key)
    }

    static func string(_ key: String) -> String? {
        // Normalize env overrides once so UI + file IO stay consistent.
        if let raw = ProcessInfo.processInfo.environment[key] {
            let value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            return value.isEmpty ? nil : value
        }
        guard let raw = self.dotenvEnvironment[key] else { return nil }
        let value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }

    static var environment: [String: String] {
        ProcessInfo.processInfo.environment.merging(self.dotenvEnvironment) { current, _ in current }
    }

    private static func loadDotEnv() -> [String: String] {
        for url in Self.dotenvURLs {
            guard FileManager.default.fileExists(atPath: url.path) else { continue }
            guard let content = try? String(contentsOf: url, encoding: .utf8) else { continue }
            let parsed = Self.parseDotEnv(content)
            if !parsed.isEmpty {
                return parsed
            }
        }
        return [:]
    }

    private static func parseDotEnv(_ content: String) -> [String: String] {
        var entries: [String: String] = [:]
        for rawLine in content.components(separatedBy: .newlines) {
            let line = rawLine.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
            guard !line.isEmpty, !line.hasPrefix("#") else { continue }

            let body: String
            if line.hasPrefix("export ") {
                body = String(line.dropFirst("export ".count))
            } else {
                body = line
            }

            guard let equalsIndex = body.firstIndex(of: "=") else { continue }
            let key = body[..<equalsIndex].trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
            guard !key.isEmpty else { continue }

            let rawValue = body[body.index(after: equalsIndex)...]
                .trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
            let value = Self.parseDotEnvValue(String(rawValue))
            entries[String(key)] = value
        }
        return entries
    }

    private static func parseDotEnvValue(_ rawValue: String) -> String {
        guard !rawValue.isEmpty else { return "" }
        if rawValue.hasPrefix("\""), rawValue.hasSuffix("\""), rawValue.count >= 2 {
            let inner = String(rawValue.dropFirst().dropLast())
            return inner
                .replacingOccurrences(of: #"\\n"#, with: "\n")
                .replacingOccurrences(of: #"\\r"#, with: "\r")
                .replacingOccurrences(of: #"\\t"#, with: "\t")
                .replacingOccurrences(of: #"\\\""#, with: "\"")
                .replacingOccurrences(of: #"\\\\"#, with: "\\")
        }
        if rawValue.hasPrefix("'"), rawValue.hasSuffix("'"), rawValue.count >= 2 {
            return String(rawValue.dropFirst().dropLast())
        }

        if let hashIndex = rawValue.firstIndex(of: "#"),
           rawValue[..<hashIndex].last?.isWhitespace == true
        {
            return String(rawValue[..<hashIndex])
                .trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
        }

        return rawValue
    }
}

enum OpenClawPaths {
    private static let configPathEnv = ["OPENCLAW_CONFIG_PATH"]
    private static let stateDirEnv = ["OPENCLAW_STATE_DIR"]

    static var stateDirURL: URL {
        for key in self.stateDirEnv {
            if let override = OpenClawEnv.path(key) {
                return URL(fileURLWithPath: override, isDirectory: true)
            }
        }
        let home = FileManager().homeDirectoryForCurrentUser
        return home.appendingPathComponent(".openclaw", isDirectory: true)
    }

    private static func resolveConfigCandidate(in dir: URL) -> URL? {
        let candidates = [
            dir.appendingPathComponent("openclaw.json"),
        ]
        return candidates.first(where: { FileManager().fileExists(atPath: $0.path) })
    }

    static var configURL: URL {
        for key in self.configPathEnv {
            if let override = OpenClawEnv.path(key) {
                return URL(fileURLWithPath: override)
            }
        }
        let stateDir = self.stateDirURL
        if let existing = self.resolveConfigCandidate(in: stateDir) {
            return existing
        }
        return stateDir.appendingPathComponent("openclaw.json")
    }

    static var workspaceURL: URL {
        self.stateDirURL.appendingPathComponent("workspace", isDirectory: true)
    }
}
