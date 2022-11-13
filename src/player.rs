use futures_util::StreamExt;
use librespot::connect::config::ConnectConfig;

use librespot;
use librespot::core::{authentication::Credentials, config::SessionConfig, session::Session};
use librespot::discovery::DeviceType;
use librespot::playback::config::PlayerConfig;
use librespot::playback::mixer::{Mixer, MixerConfig};
use librespot::playback::player::Player;
use librespot::playback::{audio_backend, mixer};
use tokio;

pub fn new_player(session: Session, player_config: PlayerConfig) -> (Player, Box<dyn Mixer>) {
    let backend = audio_backend::find(None).unwrap();
    let mixer = mixer::find(None).unwrap()(MixerConfig::default());

    let p = Player::new(
        player_config,
        session.clone(),
        mixer.get_soft_volume(),
        move || (backend)(None, librespot::playback::config::AudioFormat::F32),
    );

    return (p, mixer);
}

pub fn create_player_config() -> PlayerConfig {
    return PlayerConfig::default();
}

pub fn create_credentials() -> Credentials {
    Credentials::with_password("username", "password")
}

pub async fn create_session() -> Session {
    let session_config = SessionConfig::default();

    let session = Session::new(session_config, None);

    return session;
}

pub fn create_connect_config() -> ConnectConfig {
    ConnectConfig::default()
}

#[allow(dead_code)]
#[tokio::main]
pub async fn start_discovery(client_id: String) -> Credentials {
    let device_id = "test";

    let mut discovery = librespot::discovery::Discovery::builder(device_id, client_id.as_str())
        .name("test device")
        .device_type(DeviceType::Computer)
        .port(9001)
        .launch()
        .unwrap();

    discovery.next().await.unwrap()
}
