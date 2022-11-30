(()=>{"use strict";var e={945:function(e,t,i){var o=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.GenericPlayer=t.safe_execution=void 0;const n=o(i(361)),s=o(i(17)),a=i(997),r=i(534),l=i(593);t.safe_execution=function(e,t,i){const o=i.value;return i.value=function(...e){if(this.isInitialized)return o.call(this,...e);throw new Error(`Cannot call method ${t} before player has initialized`)},i},t.GenericPlayer=class{tokenHandler;_positionHolder;eventEmitter=new n.default;playerInstance;saveToken;_volume=0;device_id;_isInitialized=!1;get isInitialized(){return this._isInitialized}validateConfig(e){if(!e.auth)throw new Error("missing auth details from config");if(!e.auth.username||!e.auth.password)throw new Error("missing username or password from config");return e.auth.authType=e.auth.authType??"AUTHENTICATION_USER_PASS",e.backend=e.backend??"",e.bitrate=e.bitrate??"320",e.gapless=e.gapless??!1,e.passThrough=e.passThrough??!1,e.connectConfig={deviceType:e.connectConfig?.deviceType??"computer",hasVolumeControl:e.connectConfig?.hasVolumeControl??!0,initialVolume:e.connectConfig?.initialVolume??32768,name:e.connectConfig?.name??"librespot"},e.normalizationConfig={normalization:e.normalizationConfig?.normalization??!1,normalizationType:e.normalizationConfig?.normalizationType??"auto",normalizationMethod:e.normalizationConfig?.normalizationMethod??"basic",normalizationAttackCF:e.normalizationConfig?.normalizationAttackCF??0,normalizationKneeDB:e.normalizationConfig?.normalizationKneeDB??0,normalizationPregain:e.normalizationConfig?.normalizationPregain??0,normalizationReleaseCF:e.normalizationConfig?.normalizationReleaseCF??0,normalizationThreshold:e.normalizationConfig?.normalizationThreshold??0},e.save_tokens=e.save_tokens??!1,e.pos_update_interval=e.pos_update_interval??500,e.cache_path=s.default.join(e.cache_path??__dirname,"token_dump"),e}constructor(e,t="create_player"){let i=this.validateConfig(e);this.tokenHandler=new a.TokenHandler(i.cache_path),this._positionHolder=new r.PositionHolder(e.pos_update_interval),l._librespotModule[t](i,this.player_event_callback.bind(this)).then((e=>{this.playerInstance=e,this.onPlayerInitialized(),this.registerListeners(),this._isInitialized=!0,this.eventEmitter.emit("PlayerInitialized",{event:"PlayerInitialized"})})).catch((e=>{this.eventEmitter.emit("InitializationError",{event:"InitializationError",error:e})})),this._positionHolder.callback=e=>{this.eventEmitter.emit("TimeUpdated",{event:"TimeUpdated",position_ms:e})},this.saveToken=e.save_tokens??!1}player_event_callback(e){this.eventEmitter.emit(e.event,e)}registerListeners(){this.addListener("VolumeChanged",(e=>{this._volume=e.volume})),this.addListener("Playing",(e=>{this._positionHolder.setListener(),this._positionHolder.position=e.position_ms})),this.addListener("Paused",(e=>{this._positionHolder.clearListener(),this._positionHolder.position=e.position_ms})),this.addListener("Stopped",(e=>{this._positionHolder.clearListener(),this._positionHolder.position=0})),this.addListener("PositionCorrection",(e=>{this._positionHolder.position=e.position_ms})),this.addListener("Seeked",(e=>{this._positionHolder.position=e.position_ms})),this.addListener("TrackChanged",(()=>{this._positionHolder.clearListener(),this._positionHolder.position=0}))}on=this.addListener;off=this.removeListener;addListener(e,t){return this.eventEmitter.addListener(e,t)}removeListener(e,t){return this.eventEmitter.removeListener(e,t)}once(e,t){return this.eventEmitter.once(e,t)}removeAllListeners(){this.eventEmitter.removeAllListeners(),this.registerListeners()}getDeviceId(){return this.device_id}validateUri(e){const t=e.match(l.TRACK_REGEX);if(t?.groups?.type){if(t.groups.urlType?.startsWith("https")){const i=new URL(e);return[`spotify:${t.groups.type}:${i.pathname.split("/").at(-1)}`,t.groups.type]}return[e,t.groups.type]}return[void 0,void 0]}}},607:function(e,t,i){var o=this&&this.__createBinding||(Object.create?function(e,t,i,o){void 0===o&&(o=i);var n=Object.getOwnPropertyDescriptor(t,i);n&&!("get"in n?!t.__esModule:n.writable||n.configurable)||(n={enumerable:!0,get:function(){return t[i]}}),Object.defineProperty(e,o,n)}:function(e,t,i,o){void 0===o&&(o=i),e[o]=t[i]}),n=this&&this.__exportStar||function(e,t){for(var i in e)"default"===i||Object.prototype.hasOwnProperty.call(t,i)||o(t,e,i)};Object.defineProperty(t,"__esModule",{value:!0}),n(i(696),t),n(i(251),t),n(i(699),t)},251:function(e,t,i){var o=this&&this.__decorate||function(e,t,i,o){var n,s=arguments.length,a=s<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,i,o);else for(var r=e.length-1;r>=0;r--)(n=e[r])&&(a=(s<3?n(a):s>3?n(t,i,a):n(t,i))||a);return s>3&&a&&Object.defineProperty(t,i,a),a};Object.defineProperty(t,"__esModule",{value:!0}),t.SpotifyPlayer=void 0;const n=i(593),s=i(945);class a extends s.GenericPlayer{onPlayerInitialized(){this.device_id=n._librespotModule.get_device_id.call(this.playerInstance)}async play(){await n._librespotModule.play.call(this.playerInstance)}async pause(){await n._librespotModule.pause.call(this.playerInstance)}async seek(e){await n._librespotModule.seek.call(this.playerInstance,e)}async close(){this._positionHolder.clearListener(),this.eventEmitter.removeAllListeners(),await n._librespotModule.close_player.call(this.playerInstance)}getCurrentPosition(){return this._positionHolder.position}async setVolume(e,t=!1){let i=e;t||(i=Math.max(Math.min(e,100),0)/100*65535),await n._librespotModule.set_volume.call(this.playerInstance,i)}getVolume(e=!1){return e?this._volume:this._volume/65535*100}async load(e,t=!1,i=0){const o=new RegExp(/^(?<urlType>(?:spotify:|(?:https?:\/\/(?:open|play)\.spotify\.com\/)))(?:embed)?\/?(?<type>album|track|playlist|artist)(?::|\/)((?:[0-9a-zA-Z]){22})/);"string"==typeof e&&(e=[e]);for(let t of e){const e=t.match(o);if(e?.groups?.type&&e.groups.urlType?.startsWith("https")){const i=new URL(t);t=`spotify:${e.groups.type}:${i.pathname.split("/").at(-1)}`}}for(const o of e)await n._librespotModule.load_track.call(this.playerInstance,o,t,i)}async getToken(...e){if(e=e&&e.length>0?e:n.DEFAULT_SCOPES,this.saveToken){const t=await this.tokenHandler.getToken(e);if(t)return t}const t=await n._librespotModule.get_token.call(this.playerInstance,e.join(","));return t&&(t.scopes=t.scopes.split(","),t.expiry_from_epoch=Date.now()+1e3*t.expires_in,this.saveToken&&await this.tokenHandler.addToken(t)),t}async getMetadata(e){const[t,i]=this.validateUri(e);if(t&&"track"===i)return await n._librespotModule.get_canvas.call(this.playerInstance,t)}}o([s.safe_execution],a.prototype,"play",null),o([s.safe_execution],a.prototype,"pause",null),o([s.safe_execution],a.prototype,"seek",null),o([s.safe_execution],a.prototype,"close",null),o([s.safe_execution],a.prototype,"setVolume",null),o([s.safe_execution],a.prototype,"load",null),o([s.safe_execution],a.prototype,"getToken",null),o([s.safe_execution],a.prototype,"getMetadata",null),t.SpotifyPlayer=a},534:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.PositionHolder=void 0,t.PositionHolder=class{position=0;positionListener;updateInterval;callback;constructor(e){this.updateInterval=e||500}setListener(){this.clearListener(),this.positionListener=setInterval((()=>{this.position+=this.updateInterval,this.callback&&this.callback(this.position)}),this.updateInterval)}clearListener(){this.positionListener&&(clearInterval(this.positionListener),this.positionListener=void 0)}}},696:function(e,t,i){var o=this&&this.__decorate||function(e,t,i,o){var n,s=arguments.length,a=s<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,i,o);else for(var r=e.length-1;r>=0;r--)(n=e[r])&&(a=(s<3?n(a):s>3?n(t,i,a):n(t,i))||a);return s>3&&a&&Object.defineProperty(t,i,a),a};Object.defineProperty(t,"__esModule",{value:!0}),t.SpotifyPlayerSpirc=void 0;const n=i(593),s=i(945);class a extends s.GenericPlayer{onPlayerInitialized(){this.device_id=n._librespotModule.get_device_id_spirc.call(this.playerInstance)}constructor(e){super(e,"create_player_spirc")}async play(){await n._librespotModule.play_spirc.call(this.playerInstance)}async pause(){await n._librespotModule.pause_spirc.call(this.playerInstance)}async seek(e){await n._librespotModule.seek_spirc.call(this.playerInstance,e)}async close(){this._positionHolder.clearListener(),this.eventEmitter.removeAllListeners(),await n._librespotModule.close_player_spirc.call(this.playerInstance)}getCurrentPosition(){return this._positionHolder.position}async setVolume(e,t=!1){let i=e;t||(i=Math.max(Math.min(e,100),0)/100*65535),n._librespotModule.set_volume_spirc.call(this.playerInstance,i)}getVolume(e=!1){return e?this._volume:this._volume/65535*100}async load(e){const t=(await this.getToken("user-modify-playback-state"))?.access_token;if(!t)throw Error("Failed to get a valid access token");console.debug("using existing token",t);const i={method:"PUT",search:{device_id:this.device_id},auth:t,body:{}};"string"==typeof e&&(e=[e]);for(let t of e){const[e,o]=this.validateUri(t),n={};e&&("track"===o?(n.uris=n.uris??[],n.uris.push(e)):n.context_uri=e,i.body=n)}await(0,n.request)("https://api.spotify.com/v1/me/player/play",i)}async getToken(...e){if(e=e&&e.length>0?e:n.DEFAULT_SCOPES,this.saveToken){const t=await this.tokenHandler.getToken(e);if(t)return t}const t=await n._librespotModule.get_token_spirc.call(this.playerInstance,e.join(","));return t&&(t.scopes=t.scopes.split(","),t.expiry_from_epoch=Date.now()+1e3*t.expires_in,this.saveToken&&await this.tokenHandler.addToken(t)),t}async getMetadata(e){const[t,i]=this.validateUri(e);if(t&&"track"===i)return await n._librespotModule.get_canvas_spirc.call(this.playerInstance,t)}}o([s.safe_execution],a.prototype,"play",null),o([s.safe_execution],a.prototype,"pause",null),o([s.safe_execution],a.prototype,"seek",null),o([s.safe_execution],a.prototype,"close",null),o([s.safe_execution],a.prototype,"setVolume",null),o([s.safe_execution],a.prototype,"load",null),o([s.safe_execution],a.prototype,"getToken",null),o([s.safe_execution],a.prototype,"getMetadata",null),t.SpotifyPlayerSpirc=a},997:function(e,t,i){var o=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.TokenHandler=void 0;const n=o(i(491)),s=i(292);t.TokenHandler=class{tokenMap=[];filePath;readFilePromise;constructor(e){this.filePath=e,this.readFilePromise=this.readFile()}async dumpFile(){await(0,s.writeFile)(this.filePath,JSON.stringify(this.tokenMap))}async readFile(){try{this.tokenMap=JSON.parse(await(0,s.readFile)(this.filePath,{encoding:"utf-8"})),(0,n.default)(Array.isArray(this.tokenMap))}catch(e){console.warn("Failed to parse token store, creating new"),this.tokenMap=[]}}async addToken(e){await this.readFilePromise,this.tokenMap.push(e),await this.dumpFile()}async getToken(e){await this.readFilePromise;for(const t of this.tokenMap)if(e.some((e=>t.scopes.includes(e)))&&t.expiry_from_epoch>Date.now())return t}}},699:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0})},593:function(e,t,i){var o=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t._librespotModule=t.DEFAULT_SCOPES=t.request=t.TRACK_REGEX=void 0;const n=o(i(687));t.TRACK_REGEX=new RegExp(/^(?<urlType>(?:spotify:|(?:https?:\/\/(?:open|play)\.spotify\.com\/)))(?:embed)?\/?(?<type>album|track|playlist|artist)(?::|\/)((?:[0-9a-zA-Z]){22})/),t.request=function(e,t){return new Promise(((i,o)=>{const s=new URL(e);if(t.headers||(t.headers={}),t.headers["Content-Type"]||(t.headers["Content-Type"]="application/json"),t.body){const e=t.body instanceof Uint8Array?t.body:JSON.stringify(t.body);t.headers["Content-Length"]=Buffer.byteLength(e)}t.auth&&(t.headers.Authorization=`Bearer ${t.auth}`);const a={host:s.hostname,path:`${s.pathname}${t.search?`?${new URLSearchParams(t.search).toString()}`:""}`,protocol:"https:",method:t.method,headers:t.headers};let r="",l=n.default.request(a,(e=>{e.on("data",(e=>{r+=e})),e.on("end",(()=>{if(e.statusCode&&e.statusCode>=200&&e.statusCode<=299)try{i(JSON.parse(r))}catch{i(r)}else o(r)}))}));if(l.on("error",o),t.body){const e=t.body instanceof Uint8Array?t.body:JSON.stringify(t.body);l.write(e)}l.end()}))},t.DEFAULT_SCOPES=["playlist-read-collaborative","user-follow-read","user-library-read","user-top-read","user-read-recently-played","user-modify-playback-state"],t._librespotModule=i(421)},421:e=>{e.exports=require("./build/librespot.node")},491:e=>{e.exports=require("assert")},361:e=>{e.exports=require("events")},292:e=>{e.exports=require("fs/promises")},687:e=>{e.exports=require("https")},17:e=>{e.exports=require("path")}},t={},i=function i(o){var n=t[o];if(void 0!==n)return n.exports;var s=t[o]={exports:{}};return e[o].call(s.exports,s,s.exports,i),s.exports}(607);module.exports=i})();