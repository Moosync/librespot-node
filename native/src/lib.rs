// TODO: Use unwrap_or_... instead of unwraps

use constants::GLOBAL_JS_CALLBACK_METHOD;
use futures::executor::block_on;
use js_player::JsPlayerWrapper;
use js_player_spirc::JsPlayerSpircWrapper;
use librespot::{
    connect::spirc::Spirc,
    core::{Session, SpotifyId},
    playback::{mixer::Mixer, player::Player},
};
use neon::{
    prelude::{Channel, Context, FunctionContext, Handle, ModuleContext, Object},
    result::{JsResult, NeonResult},
    types::{
        Deferred, JsBoolean, JsBox, JsFunction, JsNumber, JsObject, JsPromise, JsString,
        JsUndefined, JsValue, Value,
    },
};
use utils::{
    get_connect_config_from_obj, get_credentials_from_obj, get_player_config_from_obj, token_to_obj,
};

mod constants;
mod js_player;
mod js_player_spirc;
mod player;
mod utils;
use env_logger;

trait A {}

fn send_to_spirc(
    mut cx: FunctionContext,
    callback: impl (FnOnce(&mut Spirc, Session, &Channel, Deferred)) + Send + 'static,
) -> Handle<JsPromise> {
    let player_wrapper = cx
        .this()
        .downcast_or_throw::<JsBox<JsPlayerSpircWrapper>, _>(&mut cx);

    let (deferred, promise) = cx.promise();
    match player_wrapper {
        Ok(p) => p.send(deferred, callback),

        Err(e) => {
            let error = cx
                .error(format!(
                    "Failed to get spirc from \"this\": {}",
                    e.to_string()
                ))
                .unwrap();

            deferred.reject(&mut cx, error)
        }
    }

    return promise;
}

fn send_to_player(
    mut cx: FunctionContext,
    callback: impl (FnOnce(&mut Player, &mut Box<dyn Mixer>, Session, &Channel, Deferred))
        + Send
        + 'static,
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

fn create_player_spirc(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let config = cx.argument::<JsObject>(0)?;

    let callback = cx.argument::<JsFunction>(1)?;

    let (deferred, promise) = cx.promise();
    let channel = cx.channel();

    let credentials = get_credentials_from_obj(&mut cx, config)?;
    let player_config = get_player_config_from_obj(&mut cx, config)?;
    let connect_config = get_connect_config_from_obj(&mut cx, config)?;
    let backend = config
        .get::<JsString, _, _>(&mut cx, "backend")?
        .value(&mut cx);

    let global = cx.global();
    global
        .set(&mut cx, GLOBAL_JS_CALLBACK_METHOD, callback)
        .unwrap();

    deferred.settle_with(&channel, move |mut cx| {
        let js_player =
            JsPlayerSpircWrapper::new(&mut cx, credentials, player_config, connect_config, backend);
        match js_player {
            Ok(_) => Ok(cx.boxed(js_player.unwrap())),
            Err(e) => cx.throw_error(format!("Failed to create player: {}", e.to_string())),
        }
    });

    return Ok(promise);
}

fn play_spirc(cx: FunctionContext) -> JsResult<JsPromise> {
    let promise = send_to_spirc(cx, move |player, _, channel, deferred| {
        let res = player.play();
        deferred.settle_with(channel, move |mut cx| {
            res.or_else(|err| cx.throw_error(err.to_string()))?;
            Ok(cx.undefined())
        });
    });

    Ok(promise)
}

fn pause_spirc(cx: FunctionContext) -> JsResult<JsPromise> {
    let promise = send_to_spirc(cx, move |player, _, channel, deferred| {
        let res = player.pause();
        deferred.settle_with(channel, move |mut cx| {
            res.or_else(|err| cx.throw_error(err.to_string()))?;
            Ok(cx.undefined())
        });
    });

    Ok(promise)
}

fn seek_spirc(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let pos_ms = cx.argument::<JsNumber>(0)?.value(&mut cx);

    let promise = send_to_spirc(cx, move |player, _, channel, deferred| {
        let res = player.set_position_ms(pos_ms as u32);
        deferred.settle_with(channel, move |mut cx| {
            res.or_else(|err| cx.throw_error(err.to_string()))?;
            Ok(cx.undefined())
        });
    });

    Ok(promise)
}

fn set_volume_spirc(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let volume = cx.argument::<JsNumber>(0)?.value(&mut cx);
    let promise = send_to_spirc(cx, move |player, _, channel, deferred| {
        let res = player.set_volume(volume as u16);
        deferred.settle_with(channel, move |mut cx| {
            res.or_else(|err| cx.throw_error(err.to_string()))?;
            Ok(cx.undefined())
        });
    });

    Ok(promise)
}

fn close_player_spirc(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    cx.this()
        .downcast_or_throw::<JsBox<JsPlayerSpircWrapper>, _>(&mut cx)?
        .close()
        .or_else(|err| cx.throw_error(err.to_string()))?;

    Ok(cx.undefined())
}

fn get_device_id_spirc(mut cx: FunctionContext) -> JsResult<JsValue> {
    let player_wrapper = cx
        .this()
        .downcast_or_throw::<JsBox<JsPlayerSpircWrapper>, _>(&mut cx);

    if player_wrapper.is_ok() {
        return Ok(cx
            .string(player_wrapper.unwrap().get_device_id())
            .as_value(&mut cx));
    }

    return Ok(cx.undefined().as_value(&mut cx));
}

fn get_token_spirc(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let scopes = cx.argument::<JsString>(0)?.value(&mut cx);
    let promise = send_to_spirc(cx, move |_, session, channel, deferred| {
        deferred.settle_with(channel, move |mut cx| -> Result<Handle<JsValue>, _> {
            let res = block_on(session.token_provider().get_token(scopes.as_str()));

            match res {
                Ok(t) => {
                    let (obj, mut cx) = token_to_obj(cx, t);
                    Ok(obj.as_value(&mut cx))
                }
                Err(_) => Ok(cx.undefined().as_value(&mut cx)),
            }
        });
    });

    Ok(promise)
}

fn create_player(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let config = cx.argument::<JsObject>(0)?;

    let credentials = get_credentials_from_obj(&mut cx, config)?;
    let player_config = get_player_config_from_obj(&mut cx, config)?;
    let backend = config
        .get::<JsString, _, _>(&mut cx, "backend")?
        .value(&mut cx);

    let callback = cx.argument::<JsFunction>(1)?;

    let (deferred, promise) = cx.promise();
    let channel = cx.channel();

    let global = cx.global();
    global
        .set(&mut cx, GLOBAL_JS_CALLBACK_METHOD, callback)
        .unwrap();

    deferred.settle_with(&channel, move |mut cx| {
        let js_player = JsPlayerWrapper::new(&mut cx, credentials, player_config, backend);
        match js_player {
            Ok(_) => Ok(cx.boxed(js_player.unwrap())),
            Err(e) => cx.throw_error(format!("Failed to create player: {}", e.to_string())),
        }
    });

    return Ok(promise);
}

fn play(cx: FunctionContext) -> JsResult<JsPromise> {
    let promise = send_to_player(cx, move |player, _, _, channel, deferred| {
        player.play();
        deferred.settle_with(channel, move |mut cx| Ok(cx.undefined()));
    });

    Ok(promise)
}

fn pause(cx: FunctionContext) -> JsResult<JsPromise> {
    let promise = send_to_player(cx, move |player, _, _, channel, deferred| {
        player.pause();
        deferred.settle_with(channel, move |mut cx| Ok(cx.undefined()));
    });

    Ok(promise)
}

fn seek(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let pos_ms = cx.argument::<JsNumber>(0)?.value(&mut cx);

    let promise = send_to_player(cx, move |player, _, _, channel, deferred| {
        player.seek(pos_ms as u32);
        deferred.settle_with(channel, move |mut cx| Ok(cx.undefined()));
    });

    Ok(promise)
}

fn set_volume(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let volume = cx.argument::<JsNumber>(0)?.value(&mut cx);
    let promise = send_to_player(cx, move |_, mixer, _, channel, deferred| {
        mixer.set_volume(volume as u16);
        deferred.settle_with(channel, move |mut cx| Ok(cx.undefined()));
    });

    Ok(promise)
}

fn load_track(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let track_uri = cx.argument::<JsString>(0)?.value(&mut cx);
    let auto_play = cx.argument::<JsBoolean>(1)?.value(&mut cx);
    let pos_ms = cx.argument::<JsNumber>(2)?.value(&mut cx);

    let promise = send_to_player(cx, move |player, _, _, channel, deferred| {
        let track_id_res = SpotifyId::from_uri(track_uri.as_str());
        if track_id_res.is_err() {
            deferred.settle_with(channel, move |mut cx| {
                cx.error(track_id_res.err().unwrap().to_string().as_str())
            });
            return;
        }

        player.load(track_id_res.unwrap(), auto_play, pos_ms as u32);
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

fn get_device_id(mut cx: FunctionContext) -> JsResult<JsValue> {
    let player_wrapper = cx
        .this()
        .downcast_or_throw::<JsBox<JsPlayerWrapper>, _>(&mut cx);

    if player_wrapper.is_ok() {
        return Ok(cx
            .string(player_wrapper.unwrap().get_device_id())
            .as_value(&mut cx));
    }

    return Ok(cx.undefined().as_value(&mut cx));
}

fn get_token(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let scopes = cx.argument::<JsString>(0)?.value(&mut cx);
    let promise = send_to_player(cx, move |_, _, session, channel, deferred| {
        deferred.settle_with(channel, move |mut cx| -> Result<Handle<JsValue>, _> {
            let res = block_on(session.token_provider().get_token(scopes.as_str()));

            match res {
                Ok(t) => {
                    let (obj, mut cx) = token_to_obj(cx, t);
                    Ok(obj.as_value(&mut cx))
                }
                Err(_) => Ok(cx.undefined().as_value(&mut cx)),
            }
        });
    });

    Ok(promise)
}

#[neon::main]
pub fn main(mut cx: ModuleContext) -> NeonResult<()> {
    env_logger::init();

    cx.export_function("create_player_spirc", create_player_spirc)?;
    cx.export_function("play_spirc", play_spirc)?;
    cx.export_function("pause_spirc", pause_spirc)?;
    cx.export_function("seek_spirc", seek_spirc)?;
    cx.export_function("set_volume_spirc", set_volume_spirc)?;
    cx.export_function("close_player_spirc", close_player_spirc)?;
    cx.export_function("get_device_id_spirc", get_device_id_spirc)?;
    cx.export_function("get_token_spirc", get_token_spirc)?;

    cx.export_function("create_player", create_player)?;
    cx.export_function("play", play)?;
    cx.export_function("pause", pause)?;
    cx.export_function("seek", seek)?;
    cx.export_function("set_volume", set_volume)?;
    cx.export_function("close_player", close_player)?;
    cx.export_function("get_device_id", get_device_id)?;
    cx.export_function("get_token", get_token)?;
    cx.export_function("load_track", load_track)?;

    Ok(())
}
