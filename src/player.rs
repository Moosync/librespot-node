use futures_util::StreamExt;
use librespot::connect::config::ConnectConfig;

use hex;
use librespot;
use librespot::core::spotify_id::SpotifyId;
use librespot::core::{authentication::Credentials, config::SessionConfig, session::Session};
use librespot::discovery::DeviceType;
use librespot::playback::config::PlayerConfig;
use librespot::playback::mixer::{Mixer, MixerConfig};
use librespot::playback::player::{Player, PlayerEventChannel};
use librespot::playback::{audio_backend, mixer};
use sha1::{Digest, Sha1};
use tokio;

const CLIENT_ID: &str = "e2a60dbeffd34cc7b1bd76a84ad6c1b2";

pub struct PlayerWrapper {
    player_instance: Player,
    mixer: Box<dyn Mixer>,
}

pub fn new_player(
    credentials: Credentials,
    session: Session,
    player_config: PlayerConfig,
) -> (Player, Box<dyn Mixer>) {
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

pub fn get_player_event_channel(player_instance: Player) -> PlayerEventChannel {
    player_instance.get_player_event_channel()
}

pub fn load(player_instance: &mut Player, uri: &str, auto_play: bool) -> u64 {
    let track_id = SpotifyId::from_uri(uri).unwrap();
    let res = player_instance.load(track_id, auto_play, 0);
    return res;
}

pub fn play(player_instance: Player) {
    player_instance.play()
}

pub fn pause(player_instance: Player) {
    player_instance.pause()
}

pub fn stop(player_instance: Player) {
    player_instance.stop()
}

pub fn seek(player_instance: Player, pos_ms: u32) {
    player_instance.seek(pos_ms)
}

pub fn set_backend_volume(mixer: Box<dyn Mixer>, volume: u16) -> Box<dyn Mixer> {
    mixer.set_volume(((volume.max(0).min(100) as f32 / 100f32) * u16::MAX as f32).round() as u16);
    return mixer;
}

fn device_id(name: &str) -> String {
    hex::encode(Sha1::digest(name.as_bytes()))
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
    println!("Created session");

    return session;
}

pub fn create_connect_config() -> ConnectConfig {
    ConnectConfig::default()
}

#[tokio::main]
pub async fn start_discovery() -> Credentials {
    let device_id = "test";

    let mut discovery = librespot::discovery::Discovery::builder(device_id, CLIENT_ID)
        .name("test device")
        .device_type(DeviceType::Computer)
        .port(9001)
        .launch()
        .unwrap();

    println!("waiting for discovery");
    discovery.next().await.unwrap()
}
