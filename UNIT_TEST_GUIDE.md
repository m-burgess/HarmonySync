# Unit Testing Guide

This document provides a comprehensive guide to the unit testing infrastructure for the HarmonySync application.

## Overview

The test suite follows **clean architecture** principles with tests organized into distinct layers:

- **Domain Layer Tests**: Entity validation, business logic
- **Infrastructure Layer Tests**: Database operations, persistence  
- **Application Layer Tests**: File operations, command handlers
- **Integration Tests**: End-to-end workflows

## Test Structure

```
harmonysync/src-tauri/tests/
├── tests.rs                    # Main test entry point
├── domain/
│   ├── mod.rs
│   ├── entities_test.rs        # Entity tests (78 tests)
│   └── css_generator_test.rs   # CSS generation tests (8 tests)
├── infrastructure/
│   ├── mod.rs
│   └── sqlite_repository_test.rs  # Database tests (45 tests)
├── application/
│   ├── mod.rs
│   └── file_manager_test.rs    # File operation tests (11 tests)
└── integration/
    ├── mod.rs
    └── workflow_tests.rs       # Integration tests (8 tests)
```

**Total: 142 comprehensive tests**

## Running Tests

### Run All Tests
```bash
cd harmonysync/src-tauri
cargo test --verbose
```

### Run Tests by Layer

**Domain Layer Tests:**
```bash
cargo test --test tests domain::
```

**Infrastructure Layer Tests:**
```bash
cargo test --test tests infrastructure::
```

**Application Layer Tests:**
```bash
cargo test --test tests application::
```

**Integration Tests:**
```bash
cargo test --test tests integration::
```

### Run Specific Test Files

**Entity Tests:**
```bash
cargo test --test tests domain::entities_test::
```

**CSS Generator Tests:**
```bash
cargo test --test tests domain::css_generator_test::
```

**Repository Tests:**
```bash
cargo test --test tests infrastructure::sqlite_repository_test::
```

**File Manager Tests:**
```bash
cargo test --test tests application::file_manager_test::
```

**Workflow Tests:**
```bash
cargo test --test tests integration::workflow_tests::
```

### Run Individual Tests
```bash
cargo test --test tests test_song_creation_with_all_fields
cargo test --test tests test_insert_song
cargo test --test tests test_copy_file_success
```

### Show Test Output
```bash
cargo test -- --show-output
```

### Run Tests in Parallel
```bash
cargo test -- --test-threads=4
```

### Run Tests Sequentially
```bash
cargo test -- --test-threads=1
```

## Test Coverage by Component

### Domain Layer Tests (86 tests)

#### Entity Tests (78 tests)
- **Song Tests** (6): Creation, cloning, serialization/deserialization
- **Track Tests** (3): Creation with/without names, serialization
- **Presentation Tests** (2): Creation, cloning
- **Macro Tests** (1): Creation and validation
- **Setting Tests** (2): Creation, serialization
- **Schedule Event Tests** (1): Creation with all fields
- **YouTube Link Tests** (1): Creation and validation
- **Song Details Tests** (2): With tracks, without tracks
- **Search Result Tests** (2): Song and presentation search results

#### CSS Generator Tests (8 tests)
- File creation and non-overwrite behavior
- Background gradient generation
- Animation keyframes
- RGB color values
- Directory creation
- Random color generation

### Infrastructure Layer Tests (45 tests)

#### Database Initialization (2 tests)
- Table creation
- Idempotent initialization

#### Song Repository (8 tests)
- Insert, get all, get by ID
- Update, delete operations
- Unique constraint validation
- Nonexistent ID handling

#### Track Repository (3 tests)
- Insert tracks for songs
- Get all tracks for song
- Delete track operations

#### Presentation Repository (5 tests)
- Insert, get by name, get all
- Update, delete operations

#### Setting Repository (3 tests)
- Set and get settings
- Update existing settings
- Nonexistent setting handling

#### Macro Repository (2 tests)
- Insert macro
- Get all macros

#### Schedule Repository (3 tests)
- Insert event
- Get all events
- Delete event

#### YouTube Link Repository (3 tests)
- Insert link
- Get by presentation ID
- Cascade delete on presentation deletion

### Application Layer Tests (11 tests)

#### File Manager Tests (11 tests)
- Copy file to new/existing directory
- Nonexistent source handling
- Filename preservation
- Directory creation (new, existing, nested)
- Copy directory (with files, subdirectories, empty)
- Content preservation
- Error handling

### Integration Tests (8 tests)

#### Workflow Tests (8 tests)
- **Song and Tracks Workflow**: Complete CRUD operations
- **Presentation with YouTube Links**: Association and cascade delete
- **Settings Persistence**: Multi-setting management
- **Schedule Events**: Event creation and retrieval
- **Complete Song Library**: Multi-song import simulation
- **CSS Generation Integration**: File system integration
- **Transaction Pattern**: Cleanup on failure
- **Search Functionality**: Filter and search patterns

## Test Patterns and Best Practices

### In-Memory Database Testing
All database tests use in-memory SQLite for isolation:

```rust
fn create_test_repository() -> SqliteRepository {
    let conn = Connection::open_in_memory().unwrap();
    let repo = SqliteRepository::new(conn);
    repo.init_database().unwrap();
    repo
}
```

### Temporary File Testing
File system tests use `tempfile` crate for isolation:

```rust
use tempfile::TempDir;

#[test]
fn test_file_operation() {
    let temp_dir = TempDir::new().unwrap();
    let path = temp_dir.path();
    // Test operations...
    // Cleanup is automatic when temp_dir goes out of scope
}
```

### Test Naming Convention
- Descriptive names: `test_<component>_<action>_<expected_result>`
- Examples:
  - `test_song_creation_with_all_fields`
  - `test_insert_song`
  - `test_copy_file_success`
  - `test_get_song_by_nonexistent_id`

### Assertion Patterns
```rust
// Positive assertions
assert_eq!(actual, expected);
assert!(condition);
assert!(result.is_ok());

// Negative assertions
assert!(result.is_err());
assert!(retrieved.is_none());
assert_ne!(value1, value2);

// Custom error messages
assert!(condition, "Custom error message");
```

## Continuous Integration

The GitHub Actions workflow automatically runs tests on:
- Push to `main` branch
- Pull requests to `main` branch

### CI Configuration

**.github/workflows/rust.yml**

**Test Job:**
- Runs unit tests: `cargo test --lib`
- Runs integration tests: `cargo test --test tests`
- Shows detailed output: `cargo test -- --show-output`

**Lint Job:**
- Checks formatting: `cargo fmt -- --check`
- Runs clippy: `cargo clippy -- -D warnings`

### CI Commands
```bash
# What CI runs for unit tests
cargo test --lib --verbose

# What CI runs for integration tests
cargo test --test tests --verbose

# What CI runs for coverage
cargo test --verbose -- --show-output
```

## Adding New Tests

### 1. Choose the Appropriate Layer

- **Domain tests**: For entities, business logic, pure functions
- **Infrastructure tests**: For database operations, external services
- **Application tests**: For commands, file operations, services
- **Integration tests**: For complete workflows

### 2. Create Test File

Follow the naming convention: `<module>_test.rs`

### 3. Write Tests

```rust
#[cfg(test)]
mod my_component_tests {
    use super::*;

    #[test]
    fn test_component_behavior() {
        // Arrange
        let component = create_component();
        
        // Act
        let result = component.do_something();
        
        // Assert
        assert_eq!(result, expected_value);
    }
}
```

### 4. Register Test Module

Add to the appropriate `mod.rs`:
```rust
mod my_component_test;
```

### 5. Run and Verify

```bash
cargo test my_component_test
```

## Debugging Tests

### Show Println Output
```bash
cargo test -- --show-output
```

### Run Single Test with Output
```bash
cargo test test_name -- --exact --show-output
```

### Run Tests with Backtrace
```bash
RUST_BACKTRACE=1 cargo test
```

### Run Tests with Full Backtrace
```bash
RUST_BACKTRACE=full cargo test
```

## Dependencies

### Test Dependencies (dev-dependencies in Cargo.toml)

```toml
[dev-dependencies]
mockall = "0.13"      # For mocking
tempfile = "3.15"     # For temporary file/directory testing
```

### Required Crates
- `rusqlite` - For in-memory database testing
- `serde_json` - For serialization testing
- `std::fs` - For file system operations

## Test Coverage Goals

- **Domain Layer**: 100% coverage of entities and business logic
- **Infrastructure Layer**: 95%+ coverage of repository operations
- **Application Layer**: 90%+ coverage of commands and services
- **Integration Tests**: All critical user workflows

## Common Test Scenarios

### Testing CRUD Operations
```rust
#[test]
fn test_full_crud_workflow() {
    let repo = create_test_repository();
    
    // Create
    let entity = create_entity();
    let inserted = repo.insert(&entity).unwrap();
    
    // Read
    let retrieved = repo.get_by_id(inserted.id.unwrap()).unwrap();
    assert!(retrieved.is_some());
    
    // Update
    let updated = update_entity(inserted);
    repo.update(&updated).unwrap();
    
    // Delete
    repo.delete(updated.id.unwrap()).unwrap();
    assert!(repo.get_by_id(updated.id.unwrap()).unwrap().is_none());
}
```

### Testing Error Cases
```rust
#[test]
fn test_error_handling() {
    let repo = create_test_repository();
    
    let result = repo.get_by_id(999);
    assert!(result.is_ok());
    assert!(result.unwrap().is_none());
}
```

### Testing File Operations
```rust
#[test]
fn test_file_operation() {
    let temp_dir = TempDir::new().unwrap();
    let source = temp_dir.path().join("source.txt");
    
    fs::write(&source, "content").unwrap();
    
    let result = perform_file_operation(&source);
    assert!(result.is_ok());
}
```

## Troubleshooting

### Tests Fail to Compile
1. Check Cargo.toml for correct dependencies
2. Ensure test modules are properly registered
3. Verify use statements are correct

### Database Tests Fail
1. Check if `init_database()` is called
2. Verify foreign key relationships
3. Check for unique constraint violations

### File Tests Fail
1. Ensure using `TempDir` for isolation
2. Check file permissions
3. Verify paths are correct

### CI Tests Fail but Local Tests Pass
1. Check for hardcoded paths
2. Verify all dependencies are in Cargo.toml
3. Check for race conditions in parallel tests

## Performance Considerations

- Tests use in-memory database (fast)
- Temporary directories are cleaned up automatically
- Tests can run in parallel (default)
- Use `--test-threads=1` if tests interfere with each other

## Future Enhancements

- [ ] Add property-based testing with `proptest`
- [ ] Add benchmark tests with `criterion`
- [ ] Add test coverage reporting with `tarpaulin`
- [ ] Add mutation testing with `cargo-mutants`
- [ ] Add integration tests for FFmpeg operations
- [ ] Add UI component tests for React frontend

## Resources

- [Node.js Testing Documentation](https://nodejs.org/api/test.html)
- [Jest Testing Framework](https://jestjs.io/)
- [Clean Architecture Testing Patterns](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

**Last Updated**: October 2024  
**Test Count**: 142 tests  
**Maintained by**: HarmonySync Development Team
