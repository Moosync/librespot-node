use std::time::Duration;

use hex;
use librespot;
use librespot::core::session::SessionError;
use librespot::core::spotify_id::SpotifyId;
use librespot::core::{authentication::Credentials, config::SessionConfig, session::Session};
use librespot::playback::config::{
    Bitrate, NormalisationMethod, NormalisationType, PlayerConfig, VolumeCtrl,
};
use librespot::playback::dither::{mk_ditherer, TriangularDitherer};
use librespot::playback::mixer::{Mixer, MixerConfig};
use librespot::playback::player::{
    duration_to_coefficient, Player, PlayerEvent, PlayerEventChannel,
};
use librespot::playback::{audio_backend, mixer};
use sha1::{Digest, Sha1};
use tokio;
use tokio::sync::mpsc::UnboundedReceiver;

pub struct PlayerWrapper {
    player_instance: Player,
    mixer: Box<dyn Mixer>,
    receiver: UnboundedReceiver<PlayerEvent>,
}

impl PlayerWrapper {
    pub fn new(session: Session, player_config: PlayerConfig) -> Self {
        let backend = audio_backend::find(None).unwrap();
        let mixer = mixer::find(None).unwrap()(MixerConfig::default());

        let (p, rec) = Player::new(player_config, session, mixer.get_soft_volume(), move || {
            (backend)(None, librespot::playback::config::AudioFormat::F32)
        });

        return Self {
            player_instance: p,
            mixer,
            receiver: rec,
        };
    }

    pub fn get_player_event_channel(&self) -> PlayerEventChannel {
        self.player_instance.get_player_event_channel()
    }

    pub fn load_track(&mut self, uri: &str, auto_play: bool) -> u64 {
        let track_id = SpotifyId::from_uri(uri).unwrap();
        let res = self.player_instance.load(track_id, auto_play, 0);
        return res;
    }

    pub fn play(&mut self) {
        self.player_instance.play()
    }

    pub fn pause(&mut self) {
        self.player_instance.pause()
    }

    pub fn stop(&mut self) {
        self.player_instance.stop()
    }

    pub fn seek(&mut self, pos_ms: u32) {
        self.player_instance.seek(pos_ms)
    }

    pub fn set_volume(&mut self, volume: u16) {
        self.mixer.set_volume(
            ((volume.max(0).min(100) as f32 / 100f32) * u16::MAX as f32).round() as u16,
        );
    }

    // pub fn start_discovery() {
    //     let device_id = "test";
    //     let discovery = librespot::discovery::Discovery::builder(device_id)
    //         .name("test device")
    //         .port(9001)
    //         .launch();
    //     match discovery {
    //         Ok(_d) => {
    //             println!("Created discovery")
    //         }
    //         Err(d) => panic!("Error while creating discovery: {}", d),
    //     }
    // }

    fn device_id(name: &str) -> String {
        hex::encode(Sha1::digest(name.as_bytes()))
    }

    pub fn create_player_config() -> PlayerConfig {
        return PlayerConfig::default();
    }

    pub async fn create_session() -> Result<Session, SessionError> {
        let session_config = {
            let device_id = Self::device_id("test");

            SessionConfig {
                user_agent: "1.0.0".to_string(),
                device_id: device_id,
                proxy: None,
                ap_port: Some(9001),
            }
        };

        let credentials = Credentials::with_password("username", "password");
        let session = Session::connect(session_config, credentials, None, false).await;
        println!("Created session");
        match session {
            Ok((s, _)) => return Ok(s),
            Err(e) => return Err(e),
        }
    }
}
