// TODO: Use unwrap_or_... instead of unwraps

use constants::GLOBAL_JS_CALLBACK_METHOD;
use js_player::JsPlayerWrapper;
use librespot::connect::spirc::Spirc;
use neon::{
    prelude::{Channel, Context, FunctionContext, Handle, ModuleContext, Object},
    result::{JsResult, NeonResult},
    types::{Deferred, JsBox, JsFunction, JsNumber, JsPromise, JsString, JsUndefined},
};

mod constants;
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
    let username = cx.argument::<JsString>(0)?.value(&mut cx);
    let password = cx.argument::<JsString>(1)?.value(&mut cx);
    let auth_type = cx.argument::<JsString>(2)?.value(&mut cx);
    let callback = cx.argument::<JsFunction>(3)?;

    let (deferred, promise) = cx.promise();
    let channel = cx.channel();

    let global = cx.global();
    global
        .set(&mut cx, GLOBAL_JS_CALLBACK_METHOD, callback)
        .unwrap();

    deferred.settle_with(&channel, move |mut cx| {
        let js_player = JsPlayerWrapper::new(&mut cx, username, password, auth_type);
        match js_player {
            Some(_) => Ok(cx.boxed(js_player.unwrap())),
            None => cx.throw_error("Failed to create player"),
        }
    });

    return Ok(promise);
}

fn play(cx: FunctionContext) -> JsResult<JsPromise> {
    let promise = send_to_player(cx, move |player, channel, deferred| {
        let res = player.play();
        deferred.settle_with(channel, move |mut cx| {
            res.or_else(|err| cx.throw_error(err.to_string()))?;
            Ok(cx.undefined())
        });
    });

    Ok(promise)
}

fn pause(cx: FunctionContext) -> JsResult<JsPromise> {
    let promise = send_to_player(cx, move |player, channel, deferred| {
        let res = player.pause();
        deferred.settle_with(channel, move |mut cx| {
            res.or_else(|err| cx.throw_error(err.to_string()))?;
            Ok(cx.undefined())
        });
    });

    Ok(promise)
}

fn seek(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let pos_ms = cx.argument::<JsNumber>(0)?.value(&mut cx);

    let promise = send_to_player(cx, move |player, channel, deferred| {
        let res = player.set_position_ms(pos_ms as u32);
        deferred.settle_with(channel, move |mut cx| {
            res.or_else(|err| cx.throw_error(err.to_string()))?;
            Ok(cx.undefined())
        });
    });

    Ok(promise)
}

fn set_volume(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let volume = cx.argument::<JsNumber>(0)?.value(&mut cx);
    let promise = send_to_player(cx, move |player, channel, deferred| {
        let res = player.set_volume(volume as u16);
        deferred.settle_with(channel, move |mut cx| {
            res.or_else(|err| cx.throw_error(err.to_string()))?;
            Ok(cx.undefined())
        });
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
    cx.export_function("play", play)?;
    cx.export_function("pause", pause)?;
    cx.export_function("seek", seek)?;
    cx.export_function("set_volume", set_volume)?;
    cx.export_function("close_player", close_player)?;

    Ok(())
}
