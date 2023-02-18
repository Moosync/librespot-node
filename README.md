# librespot-node

Librespot wrapper for Node.JS.

This project was bootstrapped by [create-neon](https://www.npmjs.com/package/create-neon).

### Installing

#### Using yarn

```bash
yarn add librespot-node
```

#### Using npm

```bash
npm install librespot-node --save
```

### Usage

#### Creating a SPIRC Player
SPIRC player shows up on spotify website / app

```typescript
const sp = new SpotifyPlayerSpirc({
  auth: {
    username: "username",
    password: "password",
  },
})

sp.on("PlayerInitialized", () => {
  console.log("player initialized")
})
```

#### Creating a Normal Player

```typescript
const sp = new SpotifyPlayer({
  auth: {
    username: "username",
    password: "password",
  },
})

sp.on("PlayerInitialized", () => {
  console.log("player initialized")
})
```

[Further documentation can be found here](https://moosync.app/librespot-node/)
