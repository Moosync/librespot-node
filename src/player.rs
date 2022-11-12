use std::sync::mpsc;
use std::thread;

use hex;
use librespot;
use librespot::core::session::SessionError;
use librespot::core::spotify_id::SpotifyId;
use librespot::core::{authentication::Credentials, config::SessionConfig, session::Session};
use librespot::playback::config::PlayerConfig;
use librespot::playback::mixer::MixerConfig;
use librespot::playback::player::{Player, PlayerEvent};
use librespot::playback::{audio_backend, mixer};
use neon::prelude::{Channel, Context};
use neon::result::NeonResult;
use neon::types::{Deferred, Finalize};
use sha1::{Digest, Sha1};
use tokio;
use tokio::runtime::Builder;
use tokio::sync::mpsc::UnboundedReceiver;

pub trait SendResultExt {
    // Sending a query closure to execute may fail if the channel has been closed.
    // This method converts the failure into a promise rejection.
    fn into_rejection<'a, C: Context<'a>>(self, cx: &mut C) -> NeonResult<()>;
}

impl SendResultExt for Result<(), mpsc::SendError<Message>> {
    fn into_rejection<'a, C: Context<'a>>(self, cx: &mut C) -> NeonResult<()> {
        self.or_else(|err| {
            let msg = err.to_string();

            match err.0 {
                Message::Callback(deferred, _) => {
                    let err = cx.error(msg)?;
                    deferred.reject(cx, err);
                    Ok(())
                }
                Message::Close => cx.throw_error("Expected DbMessage::Callback"),
            }
        })
    }
}

pub type Callback = Box<dyn FnOnce(&mut PlayerWrapper, &Channel, Deferred) + Send>;

pub enum Message {
    Callback(Deferred, Callback),
    Close,
}

pub struct PlayerWrapper {
    pub player_instance: Player,
    pub receiver: UnboundedReceiver<PlayerEvent>,
}

impl PlayerWrapper {
    fn new(session: Session, player_config: PlayerConfig) -> Self {
        let backend = audio_backend::find(None).unwrap();
        let volume_getter = mixer::find(None).unwrap()(MixerConfig::default()).get_soft_volume();

        let (p, rec) = Player::new(player_config, session, volume_getter, move || {
            (backend)(None, librespot::playback::config::AudioFormat::F32)
        });

        return Self {
            player_instance: p,
            receiver: rec,
        };
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
}

impl Finalize for JsPlayerWrapper {}

pub struct JsPlayerWrapper {
    tx: mpsc::Sender<Message>,
}

impl JsPlayerWrapper {
    pub fn new<'a, C>(cx: &mut C) -> Option<Self>
    where
        C: Context<'a>,
    {
        let (tx, rx) = mpsc::channel::<Message>();

        let (player_creation_tx, player_creation_rx) = mpsc::channel::<()>();

        let callback_channel = cx.channel();

        thread::spawn(move || {
            println!("Inside thread");
            let runtime = Builder::new_multi_thread()
                .enable_io()
                .enable_time()
                .build()
                .unwrap();

            runtime.block_on(async {
                // Panic thread if session fails to create
                let session = create_session().await.unwrap();
                let player_config = create_player_config();

                let mut player = PlayerWrapper::new(session, player_config);

                // Panic thread if send fails
                player_creation_tx.send(()).unwrap();

                while let Ok(message) = rx.recv() {
                    match message {
                        Message::Callback(deferred, f) => {
                            f(&mut player, &callback_channel, deferred)
                        }

                        Message::Close => break,
                    }
                }
            })
        });

        while let Ok(_) = player_creation_rx.recv() {
            println!("Created player");
            return Some(Self { tx });
        }

        return None;
    }

    pub fn close(&self) -> Result<(), mpsc::SendError<Message>> {
        self.tx.send(Message::Close)
    }

    pub fn send(
        &self,
        deferred: Deferred,
        callback: impl FnOnce(&mut PlayerWrapper, &Channel, Deferred) + Send + 'static,
    ) {
        let res = self
            .tx
            .send(Message::Callback(deferred, Box::new(callback)));
        if res.is_err() {
            panic!(
                "Failed to send command to player {}",
                res.err().unwrap().to_string()
            )
        }
    }
}

fn start_discovery() {
    let device_id = "test";
    let discovery = librespot::discovery::Discovery::builder(device_id)
        .name("test device")
        .port(9001)
        .launch();
    match discovery {
        Ok(_d) => {
            println!("Created discovery")
        }
        Err(d) => panic!("Error while creating discovery: {}", d),
    }
}

fn device_id(name: &str) -> String {
    hex::encode(Sha1::digest(name.as_bytes()))
}

fn create_player_config() -> PlayerConfig {
    return PlayerConfig::default();
}

async fn create_session() -> Result<Session, SessionError> {
    let session_config = {
        let device_id = device_id("test");

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
