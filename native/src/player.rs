use futures_util::StreamExt;

use librespot;
use librespot::core::{authentication::Credentials, config::SessionConfig, session::Session};
use librespot::discovery::DeviceType;
use librespot::playback::audio_backend::SinkBuilder;
use librespot::playback::config::{PlayerConfig, VolumeCtrl};
use librespot::playback::mixer::{Mixer, MixerConfig};
use librespot::playback::player::Player;
use librespot::playback::{audio_backend, mixer};
use tokio;

pub fn new_player(
    backend_str: String,
    session: Session,
    player_config: PlayerConfig,
) -> (Player, Box<dyn Mixer>) {
    let backend: SinkBuilder;
    if backend_str.is_empty() {
        backend = audio_backend::find(Some("rodio".to_string())).unwrap();
    } else {
        backend = audio_backend::find(Some(backend_str)).unwrap();
    }
    let mut mixer_config = MixerConfig::default();
    mixer_config.volume_ctrl = VolumeCtrl::Linear;
    let mixer = mixer::find(None).unwrap()(mixer_config);

    let p = Player::new(
        player_config,
        session.clone(),
        mixer.get_soft_volume(),
        move || (backend)(None, librespot::playback::config::AudioFormat::F32),
    );

    return (p, mixer);
}

pub fn create_session() -> Session {
    let session_config = SessionConfig::default();
    let session = Session::new(session_config, None);

    return session;
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
