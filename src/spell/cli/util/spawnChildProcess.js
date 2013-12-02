define(
	'spell/cli/util/spawnChildProcess',
	[
		'child_process',
		'os'
	],
	function(
		child_process,
	    os
	) {
		'use strict'


		return function( command, args, options, redirectStd, next ) {

			if(  command.match( /\.bat$/ ) && os.platform() == "win32" ) {
				//we need to run the shell on windows in order to run the batch file
				args.unshift( command )
				args.unshift( '/c' )

				command = process.env.COMSPEC
			}

			var child = child_process.spawn( command, args, options )

			if( redirectStd ) {
				child.stdout.on(
					'data',
					function( data ) {
						process.stdout.write( data )
					}
				)

				child.stderr.on(
					'data',
					function( data ) {
						process.stderr.write( data )
					}
				)
			}

			var error,
				status

			child.on(
				'close',
				function( status ) {
					next( error, status )
				}
			)

			child.on(
				'error',
				function( x ) {
					error = x
				}
			)

			return child
		}
	}
)
