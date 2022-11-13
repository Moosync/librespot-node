use librespot::{core::spotify_id::SpotifyId, playback::player::PlayerEvent};
use neon::{
    prelude::{Context, Handle, Object},
    types::{JsObject, JsValue, Value},
};

pub fn create_js_obj_from_event<'a, C>(cx: C, event: PlayerEvent) -> (Handle<'a, JsObject>, C)
where
    C: Context<'a>,
{
    let mut obj = StructToObj::new(cx);
    match event {
        PlayerEvent::Stopped {
            play_request_id,
            track_id,
        } => obj
            .add_event("Stopped")
            .add_number("play_request_id", play_request_id)
            .add_spotify_id("track_id", track_id),
        PlayerEvent::Loading {
            play_request_id,
            track_id,
            position_ms,
        } => obj
            .add_event("Loading")
            .add_number("play_request_id", play_request_id)
            .add_spotify_id("track_id", track_id)
            .add_number("position_ms", position_ms as u64),

        PlayerEvent::Preloading { track_id } => obj
            .add_event("Preloading")
            .add_spotify_id("track_id", track_id),
        PlayerEvent::Playing {
            play_request_id,
            track_id,
            position_ms,
        } => obj
            .add_event("Playing")
            .add_number("play_request_id", play_request_id)
            .add_spotify_id("track_id", track_id)
            .add_number("position_ms", position_ms as u64),
        PlayerEvent::Paused {
            play_request_id,
            track_id,
            position_ms,
        } => obj
            .add_event("Paused")
            .add_number("play_request_id", play_request_id)
            .add_spotify_id("track_id", track_id)
            .add_number("position_ms", position_ms as u64),
        PlayerEvent::TimeToPreloadNextTrack {
            play_request_id,
            track_id,
        } => obj
            .add_event("TimeToPreloadNextTrack")
            .add_number("play_request_id", play_request_id)
            .add_spotify_id("track_id", track_id),
        PlayerEvent::EndOfTrack {
            play_request_id,
            track_id,
        } => obj
            .add_event("EndOfTrack")
            .add_number("play_request_id", play_request_id)
            .add_spotify_id("track_id", track_id),
        PlayerEvent::Unavailable {
            play_request_id,
            track_id,
        } => obj
            .add_event("Unavailable")
            .add_number("play_request_id", play_request_id)
            .add_spotify_id("track_id", track_id),
        PlayerEvent::VolumeChanged { volume } => obj
            .add_event("VolumeChanged")
            .add_number("volume", volume as u64),
        PlayerEvent::PositionCorrection {
            play_request_id,
            track_id,
            position_ms,
        } => obj
            .add_event("PositionCorrection")
            .add_number("play_request_id", play_request_id)
            .add_spotify_id("track_id", track_id)
            .add_number("position_ms", position_ms as u64),
        PlayerEvent::Seeked {
            play_request_id,
            track_id,
            position_ms,
        } => obj
            .add_event("Seeked")
            .add_number("play_request_id", play_request_id)
            .add_spotify_id("track_id", track_id)
            .add_number("position_ms", position_ms as u64),
        PlayerEvent::TrackChanged { audio_item } => obj
            .add_event("TrackChanged")
            .add_string("audio_item", audio_item.track_id.to_string()),

        PlayerEvent::SessionConnected {
            connection_id,
            user_name,
        } => obj
            .add_event("SessionConnected")
            .add_string("connection_id", connection_id)
            .add_string("user_name", user_name),
        PlayerEvent::SessionDisconnected {
            connection_id,
            user_name,
        } => obj
            .add_event("SessionDisconnected")
            .add_string("connection_id", connection_id)
            .add_string("user_name", user_name),
        PlayerEvent::SessionClientChanged {
            client_id,
            client_name,
            client_brand_name,
            client_model_name,
        } => obj
            .add_event("SessionClientChanged")
            .add_string("client_id", client_id)
            .add_string("client_name", client_name)
            .add_string("client_brand_name", client_brand_name)
            .add_string("client_model_name", client_model_name),
        PlayerEvent::ShuffleChanged { shuffle } => {
            obj.add_event("ShuffleChanged").add_bool("shuffle", shuffle)
        }
        PlayerEvent::RepeatChanged { repeat } => {
            obj.add_event("RepeatChanged").add_bool("repeat", repeat)
        }
        PlayerEvent::AutoPlayChanged { auto_play } => obj
            .add_event("AutoPlayChanged")
            .add_bool("auto_play", auto_play),
        PlayerEvent::FilterExplicitContentChanged { filter } => obj
            .add_event("FilterExplicitContentChanged")
            .add_bool("filter", filter),
    };

    let js_obj = obj.finalize();
    let ctx = obj.context;
    return (js_obj, ctx);
}

pub struct StructToObj<'a, C: Context<'a>> {
    context: C,
    obj: Handle<'a, JsObject>,
}

impl<'a, C: Context<'a>> StructToObj<'a, C> {
    fn new(mut context: C) -> Self {
        let obj = context.empty_object();
        Self { context, obj }
    }

    fn write_to_obj(&mut self, field_name: &str, field_value: Handle<JsValue>) {
        self.obj
            .set(&mut self.context, field_name, field_value)
            .expect(stringify!(
                "Failed to write field name {} to obj",
                field_name
            ));
    }

    pub fn add_event(&mut self, value: &str) -> &mut Self {
        self.add_string("event", value.to_string());
        return self;
    }

    fn add_string(&mut self, field_name: &str, field_value: String) -> &mut Self {
        let val = self.context.string(field_value).as_value(&mut self.context);
        self.write_to_obj(field_name, val);
        return self;
    }

    fn add_bool(&mut self, field_name: &str, field_value: bool) -> &mut Self {
        let val = self
            .context
            .boolean(field_value)
            .as_value(&mut self.context);
        self.write_to_obj(field_name, val);
        return self;
    }

    fn add_spotify_id(&mut self, field_name: &str, field_value: SpotifyId) -> &mut Self {
        let val = self
            .context
            .string(field_value.to_string())
            .as_value(&mut self.context);
        self.write_to_obj(field_name, val);
        return self;
    }

    fn add_number(&mut self, field_name: &str, field_value: u64) -> &mut Self {
        let val = self
            .context
            .number(field_value as u32)
            .as_value(&mut self.context);
        self.write_to_obj(field_name, val);
        return self;
    }

    fn finalize(&self) -> Handle<'a, JsObject> {
        return self.obj;
    }
}
