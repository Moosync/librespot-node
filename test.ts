const librespot = require(".")

console.log(librespot)
const player = librespot.create_player().then((val: any) => {
  // console.log(val)
  // librespot.watch_command_events
  //   .call(val, (id: number) => {
  //     console.log("got id", id)
  //   })
  //   .then((val: any) => {
  //     console.log("watch resolved")
  //   })
  librespot.load_track.call(val, "spotify:track:6pooRNiLyYpxZeIA5kJ5EX", true)
  // .then(() => {
  //   console.log("setting volume")
  //   librespot.set_volume.call(val, 10, true)
  // })
  // // librespot.play.call(val)
  // console.log("playing")
})

// setTimeout(() => {
// }, 1000)

setInterval(() => {
  console.log("changing volume")
}, 1000)
