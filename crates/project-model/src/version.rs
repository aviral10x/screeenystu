/// Current schema version for project files.
/// Increment this when making breaking changes to the data model.
pub const SCHEMA_VERSION: u32 = 1;

/// Check if a given schema version is compatible with the current version.
pub fn is_compatible(version: u32) -> bool {
    version == SCHEMA_VERSION
}

/// Migration result for upgrading old project files.
#[derive(Debug)]
pub enum MigrationResult {
    /// Already at current version
    Current,
    /// Successfully migrated from old version
    Migrated { from: u32, to: u32 },
    /// Version too old to migrate
    TooOld { version: u32 },
    /// Version from the future (newer than this binary)
    TooNew { version: u32 },
}

/// Attempt migration of a project JSON from an older schema version.
/// Currently only supports version 1 (no migrations needed yet).
pub fn migrate_project(json: &str) -> Result<(String, MigrationResult), serde_json::Error> {
    let value: serde_json::Value = serde_json::from_str(json)?;

    let version = value
        .get("schema_version")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;

    if version == SCHEMA_VERSION {
        return Ok((json.to_string(), MigrationResult::Current));
    }

    if version > SCHEMA_VERSION {
        return Ok((json.to_string(), MigrationResult::TooNew { version }));
    }

    if version == 0 {
        return Ok((json.to_string(), MigrationResult::TooOld { version }));
    }

    // Future: add migration logic here for version upgrades
    // For now, version 1 is the only version

    Ok((json.to_string(), MigrationResult::Current))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compatibility() {
        assert!(is_compatible(SCHEMA_VERSION));
        assert!(!is_compatible(0));
        assert!(!is_compatible(SCHEMA_VERSION + 1));
    }
}
