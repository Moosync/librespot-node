use futures_util::StreamExt;
use librespot::connect::config::ConnectConfig;

use librespot;
use librespot::core::{authentication::Credentials, config::SessionConfig, session::Session};
use librespot::discovery::DeviceType;
use librespot::playback::audio_backend::SinkBuilder;
use librespot::playback::config::PlayerConfig;
use librespot::playback::mixer::{Mixer, MixerConfig};
use librespot::playback::player::Player;
use librespot::playback::{audio_backend, mixer};
use librespot::protocol::authentication::AuthenticationType;
use tokio;

pub fn new_player(
    backend_str: String,
    session: Session,
    player_config: PlayerConfig,
) -> (Player, Box<dyn Mixer>) {
    let backend: SinkBuilder;
    if backend_str.is_empty() {
        backend = audio_backend::find(None).unwrap();
    } else {
        backend = audio_backend::find(Some(backend_str)).unwrap();
    }
    let mixer = mixer::find(None).unwrap()(MixerConfig::default());

    let p = Player::new(
        player_config,
        session.clone(),
        mixer.get_soft_volume(),
        move || (backend)(None, librespot::playback::config::AudioFormat::F32),
    );

    return (p, mixer);
}

pub fn create_player_config(normalization: bool, normalization_pregain: f64) -> PlayerConfig {
    let mut config = PlayerConfig::default();
    config.normalisation = normalization;
    config.normalisation_pregain_db = normalization_pregain;
    config
}

fn get_auth_type(auth_type: &str) -> AuthenticationType {
    match auth_type {
        "AUTHENTICATION_USER_PASS" => AuthenticationType::AUTHENTICATION_USER_PASS,
        "AUTHENTICATION_STORED_SPOTIFY_CREDENTIALS" => AuthenticationType::AUTHENTICATION_USER_PASS,
        "AUTHENTICATION_STORED_FACEBOOK_CREDENTIALS" => {
            AuthenticationType::AUTHENTICATION_STORED_FACEBOOK_CREDENTIALS
        }
        "AUTHENTICATION_SPOTIFY_TOKEN" => AuthenticationType::AUTHENTICATION_SPOTIFY_TOKEN,
        "AUTHENTICATION_FACEBOOK_TOKEN" => AuthenticationType::AUTHENTICATION_FACEBOOK_TOKEN,
        _ => AuthenticationType::AUTHENTICATION_USER_PASS,
    }
}

pub fn create_credentials(username: String, password: String, auth_type: String) -> Credentials {
    Credentials {
        username: username.into(),
        auth_type: get_auth_type(auth_type.as_str()),
        auth_data: password.into_bytes(),
    }
}

pub fn create_session() -> Session {
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
