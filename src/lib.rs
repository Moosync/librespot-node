// TODO: Use unwrap_or_... instead of unwraps

use js_player::JsPlayerWrapper;
use neon::{
    prelude::{Channel, Context, FunctionContext, Handle, ModuleContext, Object},
    result::{JsResult, NeonResult},
    types::{Deferred, JsBoolean, JsBox, JsFunction, JsNumber, JsPromise, JsString, JsUndefined},
};
use player::PlayerWrapper;
use utils::create_js_obj_from_event;
mod js_player;
mod player;
mod utils;

fn send_to_player(
    mut cx: FunctionContext,
    callback: impl FnOnce(&mut PlayerWrapper, &Channel, Deferred) + Send + 'static,
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
    let (deferred, promise) = cx.promise();
    let channel = cx.channel();

    deferred.settle_with(&channel, move |mut cx| {
        let js_player = JsPlayerWrapper::new(&mut cx);
        match js_player {
            Some(_) => Ok(cx.boxed(js_player.unwrap())),
            None => cx.throw_error("Failed to create player"),
        }
    });

    return Ok(promise);
}

fn load_track(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let track_id = cx.argument::<JsString>(0)?.value(&mut cx);
    let auto_play = cx.argument::<JsBoolean>(1)?.value(&mut cx);

    let promise = send_to_player(cx, move |player, channel, deferred| {
        let res = player.load_track(track_id.as_str(), auto_play);
        deferred.settle_with(channel, move |mut cx| Ok(cx.number(res as i32))); /* res is u64 (It shouldn't matter) */
    });

    Ok(promise)
}

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
        player.stop();
        deferred.settle_with(channel, move |mut cx| Ok(cx.undefined()));
    });

    Ok(promise)
}

fn seek(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let pos_ms = cx.argument::<JsNumber>(0)?.value(&mut cx);

    let promise = send_to_player(cx, move |player, channel, deferred| {
        player.seek(pos_ms as u32);
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

fn watch_player_events(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let cb = cx.argument::<JsFunction>(0)?.root(&mut cx);
    let mut channel = cx.channel();
    channel.unref(&mut cx);

    let promise = send_to_player(cx, move |player, c, deferred| {
        let mut event_channel = player.get_player_event_channel();

        tokio::task::spawn_blocking(move || {
            // If the event queue is empty, the process may exit before this executes
            channel.send(move |mut cx| -> Result<(), _> {
                let cb = cb.into_inner(&mut cx);
                loop {
                    let message = event_channel.blocking_recv().unwrap();

                    let (msg, c) = create_js_obj_from_event(cx, message);
                    cx = c;

                    let _: Handle<JsUndefined> = cb.call_with(&mut cx).arg(msg).apply(&mut cx)?;
                }
            });
        });

        deferred.settle_with(c, move |mut cx| Ok(cx.undefined()));
    });

    Ok(promise)
}

#[neon::main]
pub fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("create_player", create_player)?;
    cx.export_function("load_track", load_track)?;
    cx.export_function("play", play)?;
    cx.export_function("pause", pause)?;
    cx.export_function("stop", stop)?;
    cx.export_function("seek", seek)?;
    cx.export_function("watch_command_events", watch_player_events)?;
    cx.export_function("close_player", close_player)?;
    Ok(())
}
