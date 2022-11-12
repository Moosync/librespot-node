const librespot = require(".")

console.log(librespot)
const player = librespot.create_player().then((val: any) => {
  console.log(val)

  librespot.watch_command_events.call(val, (id: number) => {
    console.log("got id", id)
  })

  librespot.load_track.call(val, "spotify:track:6pooRNiLyYpxZeIA5kJ5EX", true)

  // librespot.play.call(val)
  // console.log("playing")
})

// setTimeout(() => {
// }, 1000)

setInterval(() => {}, 1000)
