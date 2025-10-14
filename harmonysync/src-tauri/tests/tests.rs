// Integration tests for HarmonySync application
// This test suite covers all layers of the clean architecture:
// - Domain layer (entities, business logic)
// - Infrastructure layer (data persistence)
// - Application layer (commands and services)
// - Integration tests (end-to-end workflows)

mod domain;
mod infrastructure;
mod application;
mod integration;
