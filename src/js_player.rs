use std::{sync::mpsc, thread};

use librespot::playback::{mixer::Mixer, player::Player};
use neon::{
    prelude::{Channel, Context},
    types::{Deferred, Finalize},
};
use tokio::runtime::Builder;

use crate::player::{
    create_connect_config, create_credentials, create_player_config, create_session, new_player,
};

impl Finalize for JsPlayerWrapper {}

pub struct JsPlayerWrapper {
    tx: mpsc::Sender<Message>,
}

pub type Callback =
    Box<dyn (FnOnce(&mut Player, Box<dyn Mixer>, &Channel, Deferred) -> Box<dyn Mixer>) + Send>;

pub enum Message {
    Callback(Deferred, Callback),
    Close,
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
                let credentials = create_credentials();
                let session = create_session(credentials.clone()).await;
                let player_config = create_player_config();

                let (mut player, mut mixer) =
                    new_player(credentials.clone(), session.clone(), player_config.clone());

                // Panic thread if send fails
                player_creation_tx.send(()).unwrap();

                while let Ok(message) = rx.recv() {
                    match message {
                        Message::Callback(deferred, f) => {
                            let m = f(&mut player, mixer, &callback_channel, deferred);
                            mixer = m;
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
        callback: impl (FnOnce(&mut Player, Box<dyn Mixer>, &Channel, Deferred) -> Box<dyn Mixer>)
            + Send
            + 'static,
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
