/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./build/librespot.node":
/*!******************************!*\
  !*** ./build/librespot.node ***!
  \******************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* module decorator */ module = __webpack_require__.nmd(module);

try {
  process.dlopen(module, __dirname + (__webpack_require__(/*! path */ "path").sep) + __webpack_require__.p + "build/librespot.node");
} catch (error) {
  throw new Error('node-loader:\n' + error);
}


/***/ }),

/***/ "./src/genericPlayer.ts":
/*!******************************!*\
  !*** ./src/genericPlayer.ts ***!
  \******************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GenericPlayer = exports.safe_execution = void 0;
const events_1 = __importDefault(__webpack_require__(/*! events */ "events"));
const path_1 = __importDefault(__webpack_require__(/*! path */ "path"));
const tokenHandler_1 = __webpack_require__(/*! ./tokenHandler */ "./src/tokenHandler.ts");
const positionHolder_1 = __webpack_require__(/*! ./positionHolder */ "./src/positionHolder.ts");
const utils_1 = __webpack_require__(/*! ./utils */ "./src/utils.ts");
function safe_execution(_, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args) {
        if (this.isInitialized) {
            return originalMethod.call(this, ...args);
        }
        else {
            throw new Error(`Cannot call method ${propertyKey} before player has initialized`);
        }
    };
    return descriptor;
}
exports.safe_execution = safe_execution;
class GenericPlayer {
    tokenHandler;
    _positionHolder;
    eventEmitter = new events_1.default();
    playerInstance;
    saveToken;
    _volume = 0;
    device_id;
    _isInitialized = false;
    get isInitialized() {
        return this._isInitialized;
    }
    validateConfig(config) {
        if (!config.auth) {
            throw new Error("missing auth details from config");
        }
        if (!config.auth.username || !config.auth.password) {
            throw new Error("missing username or password from config");
        }
        config.auth.authType = config.auth.authType ?? "AUTHENTICATION_USER_PASS";
        config.backend = config.backend ?? "";
        config.bitrate = config.bitrate ?? "320";
        config.gapless = config.gapless ?? false;
        config.passThrough = config.passThrough ?? false;
        config.connectConfig = {
            deviceType: config.connectConfig?.deviceType ?? "computer",
            hasVolumeControl: config.connectConfig?.hasVolumeControl ?? true,
            initialVolume: config.connectConfig?.initialVolume ?? 32768,
            name: config.connectConfig?.name ?? "librespot",
        };
        config.normalizationConfig = {
            normalization: config.normalizationConfig?.normalization ?? false,
            normalizationType: config.normalizationConfig?.normalizationType ?? "auto",
            normalizationMethod: config.normalizationConfig?.normalizationMethod ?? "basic",
            normalizationAttackCF: config.normalizationConfig?.normalizationAttackCF ?? 0,
            normalizationKneeDB: config.normalizationConfig?.normalizationKneeDB ?? 0,
            normalizationPregain: config.normalizationConfig?.normalizationPregain ?? 0,
            normalizationReleaseCF: config.normalizationConfig?.normalizationReleaseCF ?? 0,
            normalizationThreshold: config.normalizationConfig?.normalizationThreshold ?? 0,
        };
        config.save_tokens = config.save_tokens ?? false;
        config.pos_update_interval = config.pos_update_interval ?? 500;
        config.cache_path = path_1.default.join(config.cache_path ?? __dirname, "token_dump");
        return config;
    }
    constructor(config, playerConstructMethod = "create_player") {
        let validatedConfig = this.validateConfig(config);
        this.tokenHandler = new tokenHandler_1.TokenHandler(validatedConfig.cache_path);
        this._positionHolder = new positionHolder_1.PositionHolder(config.pos_update_interval);
        utils_1._librespotModule[playerConstructMethod](validatedConfig, this.player_event_callback.bind(this))
            .then((val) => {
            this.playerInstance = val;
            this.onPlayerInitialized();
            this.registerListeners();
            this._isInitialized = true;
            this.eventEmitter.emit("PlayerInitialized", {
                event: "PlayerInitialized",
            });
        })
            .catch((e) => {
            this.eventEmitter.emit("InitializationError", {
                event: "InitializationError",
                error: e,
            });
        });
        this._positionHolder.callback = (position_ms) => {
            this.eventEmitter.emit("TimeUpdated", {
                event: "TimeUpdated",
                position_ms,
            });
        };
        this.saveToken = config.save_tokens ?? false;
    }
    player_event_callback(event) {
        this.eventEmitter.emit(event.event, event);
    }
    registerListeners() {
        this.addListener("VolumeChanged", (event) => {
            this._volume = event.volume;
        });
        this.addListener("Playing", (e) => {
            this._positionHolder.setListener();
            this._positionHolder.position = e.position_ms;
        });
        this.addListener("Paused", (e) => {
            this._positionHolder.clearListener();
            this._positionHolder.position = e.position_ms;
        });
        this.addListener("Stopped", (e) => {
            this._positionHolder.clearListener();
            this._positionHolder.position = 0;
        });
        this.addListener("PositionCorrection", (e) => {
            this._positionHolder.position = e.position_ms;
        });
        this.addListener("Seeked", (e) => {
            this._positionHolder.position = e.position_ms;
        });
        this.addListener("TrackChanged", () => {
            this._positionHolder.clearListener();
            this._positionHolder.position = 0;
        });
    }
    on = this.addListener;
    off = this.removeListener;
    addListener(event, callback) {
        return this.eventEmitter.addListener(event, callback);
    }
    removeListener(event, callback) {
        return this.eventEmitter.removeListener(event, callback);
    }
    once(event, callback) {
        return this.eventEmitter.once(event, callback);
    }
    removeAllListeners() {
        this.eventEmitter.removeAllListeners();
        this.registerListeners();
    }
    getDeviceId() {
        return this.device_id;
    }
}
exports.GenericPlayer = GenericPlayer;


/***/ }),

/***/ "./src/index.ts":
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(/*! ./spirc */ "./src/spirc.ts"), exports);
__exportStar(__webpack_require__(/*! ./player */ "./src/player.ts"), exports);
__exportStar(__webpack_require__(/*! ./types */ "./src/types.ts"), exports);


/***/ }),

/***/ "./src/player.ts":
/*!***********************!*\
  !*** ./src/player.ts ***!
  \***********************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SpotifyPlayer = void 0;
const utils_1 = __webpack_require__(/*! ./utils */ "./src/utils.ts");
const genericPlayer_1 = __webpack_require__(/*! ./genericPlayer */ "./src/genericPlayer.ts");
class SpotifyPlayer extends genericPlayer_1.GenericPlayer {
    onPlayerInitialized() {
        this.device_id = utils_1._librespotModule.get_device_id.call(this.playerInstance);
    }
    async play() {
        await utils_1._librespotModule.play.call(this.playerInstance);
    }
    async pause() {
        await utils_1._librespotModule.pause.call(this.playerInstance);
    }
    async seek(posMs) {
        await utils_1._librespotModule.seek.call(this.playerInstance, posMs);
    }
    async close() {
        this._positionHolder.clearListener();
        this.eventEmitter.removeAllListeners();
        await utils_1._librespotModule.close_player.call(this.playerInstance);
    }
    getCurrentPosition() {
        return this._positionHolder.position;
    }
    async setVolume(volume, raw = false) {
        let parsedVolume = volume;
        if (!raw) {
            parsedVolume = (Math.max(Math.min(volume, 100), 0) / 100) * 65535;
        }
        await utils_1._librespotModule.set_volume.call(this.playerInstance, parsedVolume);
    }
    getVolume(raw = false) {
        if (raw) {
            return this._volume;
        }
        return (this._volume / 65535) * 100;
    }
    async load(trackURIs, autoPlay = false, startPosition = 0) {
        const regex = new RegExp(/^(?<urlType>(?:spotify:|(?:https?:\/\/(?:open|play)\.spotify\.com\/)))(?:embed)?\/?(?<type>album|track|playlist|artist)(?::|\/)((?:[0-9a-zA-Z]){22})/);
        if (typeof trackURIs === "string") {
            trackURIs = [trackURIs];
        }
        for (let trackURI of trackURIs) {
            const match = trackURI.match(regex);
            if (match?.groups?.type) {
                if (match.groups.urlType?.startsWith("https")) {
                    const parsedUrl = new URL(trackURI);
                    trackURI = `spotify:${match.groups.type}:${parsedUrl.pathname
                        .split("/")
                        .at(-1)}`;
                }
            }
        }
        for (const t of trackURIs) {
            await utils_1._librespotModule.load_track.call(this.playerInstance, t, autoPlay, startPosition);
        }
    }
    async getToken(...scopes) {
        scopes = scopes && scopes.length > 0 ? scopes : utils_1.DEFAULT_SCOPES;
        if (this.saveToken) {
            const cachedToken = await this.tokenHandler.getToken(scopes);
            if (cachedToken) {
                return cachedToken;
            }
        }
        const res = await utils_1._librespotModule.get_token.call(this.playerInstance, scopes.join(","));
        if (res) {
            res.scopes = res.scopes.split(",");
            res.expiry_from_epoch = Date.now() + res.expires_in;
            if (this.saveToken) {
                await this.tokenHandler.addToken(res);
            }
        }
        return res;
    }
}
__decorate([
    genericPlayer_1.safe_execution
], SpotifyPlayer.prototype, "play", null);
__decorate([
    genericPlayer_1.safe_execution
], SpotifyPlayer.prototype, "pause", null);
__decorate([
    genericPlayer_1.safe_execution
], SpotifyPlayer.prototype, "seek", null);
__decorate([
    genericPlayer_1.safe_execution
], SpotifyPlayer.prototype, "close", null);
__decorate([
    genericPlayer_1.safe_execution
], SpotifyPlayer.prototype, "setVolume", null);
__decorate([
    genericPlayer_1.safe_execution
], SpotifyPlayer.prototype, "load", null);
__decorate([
    genericPlayer_1.safe_execution
], SpotifyPlayer.prototype, "getToken", null);
exports.SpotifyPlayer = SpotifyPlayer;


/***/ }),

/***/ "./src/positionHolder.ts":
/*!*******************************!*\
  !*** ./src/positionHolder.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PositionHolder = void 0;
const POSITION_UPDATE_INTERVAL = 500;
class PositionHolder {
    position = 0;
    positionListener;
    updateInterval;
    callback;
    constructor(updateInterval) {
        this.updateInterval = updateInterval || POSITION_UPDATE_INTERVAL;
    }
    setListener() {
        this.clearListener();
        this.positionListener = setInterval(() => {
            this.position += this.updateInterval;
            this.callback && this.callback(this.position);
        }, this.updateInterval);
    }
    clearListener() {
        if (this.positionListener) {
            clearInterval(this.positionListener);
            this.positionListener = undefined;
        }
    }
}
exports.PositionHolder = PositionHolder;


/***/ }),

/***/ "./src/spirc.ts":
/*!**********************!*\
  !*** ./src/spirc.ts ***!
  \**********************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SpotifyPlayerSpirc = void 0;
const utils_1 = __webpack_require__(/*! ./utils */ "./src/utils.ts");
const genericPlayer_1 = __webpack_require__(/*! ./genericPlayer */ "./src/genericPlayer.ts");
class SpotifyPlayerSpirc extends genericPlayer_1.GenericPlayer {
    onPlayerInitialized() {
        this.device_id = utils_1._librespotModule.get_device_id_spirc.call(this.playerInstance);
    }
    constructor(config) {
        super(config, "create_player_spirc");
    }
    async play() {
        await utils_1._librespotModule.play_spirc.call(this.playerInstance);
    }
    async pause() {
        await utils_1._librespotModule.pause_spirc.call(this.playerInstance);
    }
    async seek(posMs) {
        await utils_1._librespotModule.seek_spirc.call(this.playerInstance, posMs);
    }
    async close() {
        this._positionHolder.clearListener();
        this.eventEmitter.removeAllListeners();
        await utils_1._librespotModule.close_player_spirc.call(this.playerInstance);
    }
    getCurrentPosition() {
        return this._positionHolder.position;
    }
    async setVolume(volume, raw = false) {
        let parsedVolume = volume;
        if (!raw) {
            parsedVolume = (Math.max(Math.min(volume, 100), 0) / 100) * 65535;
        }
        utils_1._librespotModule.set_volume_spirc.call(this.playerInstance, parsedVolume);
    }
    getVolume(raw = false) {
        if (raw) {
            return this._volume;
        }
        return (this._volume / 65535) * 100;
    }
    async load(trackURIs) {
        const token = (await this.getToken("user-modify-playback-state"))
            ?.access_token;
        if (!token) {
            throw Error("Failed to get a valid access token");
        }
        console.debug("using existing token", token);
        const options = {
            method: "PUT",
            search: {
                device_id: this.device_id,
            },
            auth: token,
            body: {},
        };
        const regex = new RegExp(/^(?<urlType>(?:spotify:|(?:https?:\/\/(?:open|play)\.spotify\.com\/)))(?:embed)?\/?(?<type>album|track|playlist|artist)(?::|\/)((?:[0-9a-zA-Z]){22})/);
        if (typeof trackURIs === "string") {
            trackURIs = [trackURIs];
        }
        for (let trackURI of trackURIs) {
            const match = trackURI.match(regex);
            if (match?.groups?.type) {
                if (match.groups.urlType?.startsWith("https")) {
                    const parsedUrl = new URL(trackURI);
                    trackURI = `spotify:${match.groups.type}:${parsedUrl.pathname
                        .split("/")
                        .at(-1)}`;
                }
                switch (match.groups.type) {
                    case "track":
                        options.body["uris"] = options.body["uris"] ?? [];
                        options.body["uris"].push(trackURI);
                        break;
                    default:
                        options.body["context_uri"] = trackURI;
                        break;
                }
            }
        }
        await (0, utils_1.request)("https://api.spotify.com/v1/me/player/play", options);
    }
    async getToken(...scopes) {
        scopes = scopes && scopes.length > 0 ? scopes : utils_1.DEFAULT_SCOPES;
        if (this.saveToken) {
            const cachedToken = await this.tokenHandler.getToken(scopes);
            if (cachedToken) {
                return cachedToken;
            }
        }
        const res = await utils_1._librespotModule.get_token_spirc.call(this.playerInstance, scopes.join(","));
        if (res) {
            res.scopes = res.scopes.split(",");
            res.expiry_from_epoch = Date.now() + res.expires_in;
            if (this.saveToken) {
                await this.tokenHandler.addToken(res);
            }
        }
        return res;
    }
}
__decorate([
    genericPlayer_1.safe_execution
], SpotifyPlayerSpirc.prototype, "play", null);
__decorate([
    genericPlayer_1.safe_execution
], SpotifyPlayerSpirc.prototype, "pause", null);
__decorate([
    genericPlayer_1.safe_execution
], SpotifyPlayerSpirc.prototype, "seek", null);
__decorate([
    genericPlayer_1.safe_execution
], SpotifyPlayerSpirc.prototype, "close", null);
__decorate([
    genericPlayer_1.safe_execution
], SpotifyPlayerSpirc.prototype, "setVolume", null);
__decorate([
    genericPlayer_1.safe_execution
], SpotifyPlayerSpirc.prototype, "load", null);
__decorate([
    genericPlayer_1.safe_execution
], SpotifyPlayerSpirc.prototype, "getToken", null);
exports.SpotifyPlayerSpirc = SpotifyPlayerSpirc;


/***/ }),

/***/ "./src/tokenHandler.ts":
/*!*****************************!*\
  !*** ./src/tokenHandler.ts ***!
  \*****************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TokenHandler = void 0;
const assert_1 = __importDefault(__webpack_require__(/*! assert */ "assert"));
const promises_1 = __webpack_require__(/*! fs/promises */ "fs/promises");
class TokenHandler {
    tokenMap = [];
    filePath;
    constructor(filePath) {
        this.filePath = filePath;
    }
    async dumpFile() {
        await (0, promises_1.writeFile)(this.filePath, JSON.stringify(this.tokenMap));
    }
    async readFile() {
        try {
            this.tokenMap = JSON.parse(await (0, promises_1.readFile)(this.filePath, { encoding: "utf-8" }));
            (0, assert_1.default)(Array.isArray(this.tokenMap));
        }
        catch (e) {
            console.warn("Failed to parse token store, creating new");
            this.tokenMap = [];
        }
    }
    async addToken(token) {
        await this.readFile();
        this.tokenMap.push(token);
        await this.dumpFile();
    }
    async getToken(scopes) {
        await this.readFile();
        for (const token of this.tokenMap) {
            // Check if required scopes are already cached
            if (scopes.some((val) => token.scopes.includes(val))) {
                if (token.expiry_from_epoch > Date.now()) {
                    // Check if the matching token is not expired
                    return token;
                }
            }
        }
    }
}
exports.TokenHandler = TokenHandler;


/***/ }),

/***/ "./src/types.ts":
/*!**********************!*\
  !*** ./src/types.ts ***!
  \**********************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));


/***/ }),

/***/ "./src/utils.ts":
/*!**********************!*\
  !*** ./src/utils.ts ***!
  \**********************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._librespotModule = exports.DEFAULT_SCOPES = exports.request = void 0;
const https_1 = __importDefault(__webpack_require__(/*! https */ "https"));
function request(url, config) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        if (!config.headers) {
            config.headers = {};
        }
        config.headers["Content-Type"] = "application/json";
        if (config.body) {
            config.headers["Content-Length"] = Buffer.byteLength(JSON.stringify(config.body));
        }
        if (config.auth) {
            config.headers["Authorization"] = `Bearer ${config.auth}`;
        }
        const options = {
            host: parsedUrl.hostname,
            path: `${parsedUrl.pathname}${config.search ? `?${new URLSearchParams(config.search).toString()}` : ""}`,
            protocol: "https:",
            method: config.method,
            headers: config.headers,
        };
        let data = "";
        let req = https_1.default.request(options, (res) => {
            res.on("data", (chunk) => {
                data += chunk;
            });
            res.on("end", () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode <= 299) {
                    try {
                        resolve(JSON.parse(data));
                    }
                    catch {
                        resolve(data);
                    }
                }
                else {
                    reject(data);
                }
            });
        });
        req.on("error", reject);
        if (config.body) {
            req.write(JSON.stringify(config.body));
        }
        req.end();
    });
}
exports.request = request;
exports.DEFAULT_SCOPES = [
    "playlist-read-collaborative",
    "user-follow-read",
    "user-library-read",
    "user-top-read",
    "user-read-recently-played",
    "user-modify-playback-state",
];
exports._librespotModule = __webpack_require__(/*! ../build/librespot.node */ "./build/librespot.node");


/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ "fs/promises":
/*!******************************!*\
  !*** external "fs/promises" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("fs/promises");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/node module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.nmd = (module) => {
/******/ 			module.paths = [];
/******/ 			if (!module.children) module.children = [];
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "";
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/index.ts");
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=index.js.map