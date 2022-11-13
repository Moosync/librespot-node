// TODO: Use unwrap_or_... instead of unwraps

use std::{
    sync::{mpsc, Arc},
    thread,
};

use js_player::JsPlayerWrapper;
use librespot::{
    connect::spirc::Spirc,
    playback::{
        mixer::Mixer,
        player::{Player, PlayerEvent, PlayerEventChannel},
    },
};
use neon::{
    prelude::{Channel, Context, FunctionContext, Handle, ModuleContext, Object},
    result::{JsResult, NeonResult},
    types::{Deferred, JsBoolean, JsBox, JsFunction, JsNumber, JsPromise, JsString, JsUndefined},
};

use player::{load, set_backend_volume};
use tokio::runtime::Builder;
use utils::create_js_obj_from_event;

use crate::player::start_discovery;
mod js_player;
mod player;
mod utils;

fn send_to_player(
    mut cx: FunctionContext,
    callback: impl (FnOnce(&mut Spirc, &Channel, Deferred)) + Send + 'static,
) -> Handle<JsPromise> {
    let player_wrapper = cx
        .this()
        .downcast_or_throw::<JsBox<JsPlayerWrapper>, _>(&mut cx);

    let (deferred, promise) = cx.promise();
    match player_wrapper {
        Ok(p) => p.send(deferred, callback),

        Err(e) => {
            let error = cx
                .error(format!(
                    "Failed to get player from \"this\": {}",
                    e.to_string()
                ))
                .unwrap();

            deferred.reject(&mut cx, error)
        }
    }

    return promise;
}

fn create_player(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let callback = cx.argument::<JsFunction>(0)?;
    let (deferred, promise) = cx.promise();
    let channel = cx.channel();

    let global = cx.global();
    global
        .set(&mut cx, "_watch_player_events_global", callback)
        .unwrap();

    deferred.settle_with(&channel, move |mut cx| {
        let js_player = JsPlayerWrapper::new(&mut cx);
        match js_player {
            Some(_) => Ok(cx.boxed(js_player.unwrap())),
            None => cx.throw_error("Failed to create player"),
        }
    });

    return Ok(promise);
}

// fn load_track(mut cx: FunctionContext) -> JsResult<JsPromise> {
//     let track_id = cx.argument::<JsString>(0)?.value(&mut cx);
//     let auto_play = cx.argument::<JsBoolean>(1)?.value(&mut cx);

//     let promise = send_to_player(cx, move |spirc, _, channel, deferred| {
//         let res = load(player, track_id.as_str(), auto_play);
//         deferred.settle_with(channel, move |mut cx| Ok(cx.number(res as i32))); /* res is u64 (It shouldn't matter) */
//     });

//     Ok(promise)
// }

fn play(cx: FunctionContext) -> JsResult<JsPromise> {
    let promise = send_to_player(cx, move |player, channel, deferred| {
        player.play();
        deferred.settle_with(channel, move |mut cx| Ok(cx.undefined()));
    });

    Ok(promise)
}

fn pause(cx: FunctionContext) -> JsResult<JsPromise> {
    let promise = send_to_player(cx, move |player, channel, deferred| {
        player.pause();
        deferred.settle_with(channel, move |mut cx| Ok(cx.undefined()));
    });

    Ok(promise)
}

fn stop(cx: FunctionContext) -> JsResult<JsPromise> {
    let promise = send_to_player(cx, move |player, channel, deferred| {
        player.pause();
        deferred.settle_with(channel, move |mut cx| Ok(cx.undefined()));
    });

    Ok(promise)
}

fn seek(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let pos_ms = cx.argument::<JsNumber>(0)?.value(&mut cx);

    let promise = send_to_player(cx, move |player, channel, deferred| {
        player.set_position_ms(pos_ms as u32);
        deferred.settle_with(channel, move |mut cx| Ok(cx.undefined()));
    });

    Ok(promise)
}

fn set_volume(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let volume = cx.argument::<JsNumber>(0)?.value(&mut cx);
    let promise = send_to_player(cx, move |player, channel, deferred| {
        player.set_volume(volume as u16);
        deferred.settle_with(channel, move |mut cx| Ok(cx.undefined()));
    });

    Ok(promise)
}

fn close_player(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    cx.this()
        .downcast_or_throw::<JsBox<JsPlayerWrapper>, _>(&mut cx)?
        .close()
        .or_else(|err| cx.throw_error(err.to_string()))?;

    Ok(cx.undefined())
}

#[neon::main]
pub fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("create_player", create_player)?;
    // cx.export_function("load_track", load_track)?;
    cx.export_function("play", play)?;
    cx.export_function("pause", pause)?;
    cx.export_function("stop", stop)?;
    cx.export_function("seek", seek)?;
    cx.export_function("set_volume", set_volume)?;
    // cx.export_function("watch_command_events", watch_player_events)?;
    cx.export_function("close_player", close_player)?;

    // start_discovery();

    Ok(())
}
