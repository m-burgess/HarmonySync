use std::env;

#[tokio::test]
async fn audio_service_start_check_stop() {
    // Only run this integration test when explicitly enabled in CI or locally
    if env::var("RUN_AUDIO_INTEGRATION_TEST").unwrap_or_default() != "1" {
        eprintln!("Skipping audio_service_start_check_stop - set RUN_AUDIO_INTEGRATION_TEST=1 to enable");
        return;
    }

    use app_lib::application::commands::{start_audio_service, check_audio_service_status, stop_audio_service};

    // Start the audio service
    let start = start_audio_service().await;
    assert!(start.is_ok(), "Failed to start audio service: {:?}", start.err());

    // Wait briefly for service to become responsive
    tokio::time::sleep(std::time::Duration::from_millis(1500)).await;

    // Check status
    let status = check_audio_service_status().await;
    assert!(status.is_ok(), "Failed to check audio service status: {:?}", status.err());
    assert!(status.unwrap_or(false), "Audio service not reporting healthy after start");

    // Stop the audio service
    let stop = stop_audio_service().await;
    assert!(stop.is_ok(), "Failed to stop audio service: {:?}", stop.err());
}
