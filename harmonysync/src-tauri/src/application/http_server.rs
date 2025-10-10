use std::net::SocketAddr;
use std::path::PathBuf;
use log::info;
use tokio::sync::oneshot;

pub async fn start_server(port: u16, serve_dir: PathBuf) -> Result<(String, oneshot::Sender<()>), String> {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));

    if !serve_dir.is_dir() {
        return Err(format!("Serve directory does not exist: {}", serve_dir.display()));
    }

    let routes = warp::fs::dir(serve_dir.clone());

    info!("Attempting to start HTTP server on {} serving directory: {}", addr, serve_dir.display());

    let (tx, rx) = oneshot::channel();

    let _server_handle = tokio::spawn(async move {
        let (_, server) = warp::serve(routes).bind_with_graceful_shutdown(addr, async {
            rx.await.ok();
        });
        server.await;
        info!("HTTP server on {} has shut down.", addr);
    });

    // We don't need to check for connection here. If bind_with_graceful_shutdown
    // didn't return an error, it means it's attempting to start.
    // The server_handle will keep the task alive.

    info!("HTTP server task spawned for {}", addr);
    Ok((format!("http://{}:{}", addr.ip(), addr.port()), tx)) // Return the URL and the sender
}

pub async fn stop_server(tx: oneshot::Sender<()>) {
    info!("Attempting to stop HTTP server.");
    let _ = tx.send(()); // Send shutdown signal
    info!("HTTP server shutdown signal sent.");
}