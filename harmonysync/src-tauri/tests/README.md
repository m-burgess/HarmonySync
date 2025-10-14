# HarmonySync Test Suite

This directory contains comprehensive unit and integration tests for the HarmonySync application, organized following clean architecture principles.

## Quick Start

Run all tests:
```bash
cd harmonysync/src-tauri
cargo test
```

## Test Organization

### Clean Architecture Layers

```
tests/
├── tests.rs                    # Main test runner
├── domain/                     # Domain layer tests (business logic)
│   ├── entities_test.rs       # 78 tests for entities
│   └── css_generator_test.rs  # 8 tests for CSS generation
├── infrastructure/             # Infrastructure layer tests (data)
│   └── sqlite_repository_test.rs  # 45 tests for database
├── application/                # Application layer tests (services)
│   └── file_manager_test.rs   # 11 tests for file operations
└── integration/                # Integration tests (workflows)
    └── workflow_tests.rs       # 8 end-to-end workflow tests
```

## Test Statistics

| Layer          | Test Files | Test Cases | Focus Area                    |
|----------------|------------|------------|-------------------------------|
| Domain         | 2          | 86         | Entities, business logic      |
| Infrastructure | 1          | 45         | Database operations           |
| Application    | 1          | 11         | File operations               |
| Integration    | 1          | 8          | Complete workflows            |
| **Total**      | **5**      | **142**    | **Full application coverage** |

## Running Tests by Layer

### Domain Layer
```bash
cargo test --test tests domain::
```
Tests entities, value objects, and domain services.

### Infrastructure Layer
```bash
cargo test --test tests infrastructure::
```
Tests database operations, repositories, and data persistence.

### Application Layer
```bash
cargo test --test tests application::
```
Tests commands, services, and file operations.

### Integration Layer
```bash
cargo test --test tests integration::
```
Tests complete user workflows and feature interactions.

## Key Features

### ✅ Comprehensive Coverage
- All entities tested for creation, serialization, and validation
- All repository methods tested (CRUD operations)
- File operations tested with real filesystem
- Complete workflows tested end-to-end

### ✅ Test Isolation
- In-memory SQLite database for fast, isolated tests
- Temporary directories for file operations
- Each test is independent and can run in parallel

### ✅ Clean Architecture
- Tests mirror the source code structure
- Clear separation of concerns
- Easy to locate and understand tests

### ✅ CI/CD Integration
- Automatic execution on push and pull requests
- Separate test and lint jobs
- Caching for faster builds

## Test Examples

### Entity Test
```rust
#[test]
fn test_song_creation_with_all_fields() {
    let song = Song {
        id: Some(1),
        title: "Amazing Grace".to_string(),
        lyrics: Some("Amazing grace how sweet the sound".to_string()),
    };
    
    assert_eq!(song.id, Some(1));
    assert_eq!(song.title, "Amazing Grace");
}
```

### Repository Test
```rust
#[test]
fn test_insert_song() {
    let repo = create_test_repository();
    
    let song = Song {
        id: None,
        title: "Test Song".to_string(),
        lyrics: Some("Test lyrics".to_string()),
    };
    
    let result = repo.insert(&song);
    assert!(result.is_ok());
}
```

### Integration Test
```rust
#[test]
fn test_song_and_tracks_workflow() {
    let repo = create_test_repository();
    
    // Create song
    let song = repo.insert(&Song { ... }).unwrap();
    
    // Add tracks
    for track in tracks {
        repo.insert(&track).unwrap();
    }
    
    // Verify
    let retrieved_tracks = repo.get_all_for_song(song.id.unwrap()).unwrap();
    assert_eq!(retrieved_tracks.len(), 3);
}
```

## Adding New Tests

1. **Identify the layer**: Domain, Infrastructure, Application, or Integration
2. **Create test file**: Follow naming convention `<module>_test.rs`
3. **Write tests**: Use descriptive names and clear assertions
4. **Register module**: Add to appropriate `mod.rs`
5. **Run tests**: `cargo test <test_name>`

See [UNIT_TEST_GUIDE.md](../../../UNIT_TEST_GUIDE.md) for detailed instructions.

## Best Practices

- ✅ Use descriptive test names
- ✅ One assertion per test (when possible)
- ✅ Arrange-Act-Assert pattern
- ✅ Clean up resources (use TempDir, in-memory DB)
- ✅ Test both success and error cases
- ✅ Keep tests fast and independent

## Documentation

For comprehensive testing documentation, see:
- [UNIT_TEST_GUIDE.md](../../../UNIT_TEST_GUIDE.md) - Complete testing guide
- [TESTING_GUIDE.md](../../../TESTING_GUIDE.md) - Manual testing guide

## CI/CD

Tests automatically run on:
- Push to `main` branch
- Pull requests to `main` branch

View workflow: `.github/workflows/rust.yml`

## Dependencies

Test dependencies (Cargo.toml):
```toml
[dev-dependencies]
mockall = "0.13"
tempfile = "3.15"
```

## Troubleshooting

### Tests won't compile
- Check test dependencies in Cargo.toml
- Verify module registrations in mod.rs files

### Database tests fail
- Ensure `init_database()` is called
- Check for unique constraint violations

### File tests fail
- Use TempDir for temporary files
- Check file paths are correct

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Ensure tests pass: `cargo test`
3. Add integration tests for workflows
4. Update this README if adding new test files

---

**Last Updated**: October 2024  
**Test Framework**: Rust built-in test framework  
**Total Tests**: 142
