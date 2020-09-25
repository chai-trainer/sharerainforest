const rewire = require('rewire')
const defaults = rewire('react-scripts/scripts/build.js') // If you ejected, use this instead: const defaults = rewire('./build.js')
let config = defaults.__get__('config')

config.optimization.splitChunks = {
	cacheGroups: {
		default: false
	}
}
//config.output.filename = 'static/js/main.xtn.js'
//config.plugins[5].options.filename = 'static/css/[main.css'
//config.plugins[5].options.moduleFilename = () => 'static/css/main.css'
config.optimization.runtimeChunk = false
