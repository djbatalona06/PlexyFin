/// <reference types="vite/client" />

// hls.js ships one set of types; the "light" build has the same API.
declare module 'hls.js/light' {
  import Hls from 'hls.js'
  export default Hls
}
