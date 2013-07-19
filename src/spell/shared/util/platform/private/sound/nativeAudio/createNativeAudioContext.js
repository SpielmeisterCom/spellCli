define(
	'spell/shared/util/platform/private/sound/nativeAudio/createNativeAudioContext',
	[
		'spell/shared/util/platform/private/sound/createFixedSoundFileSrc',
		'spell/shared/util/platform/private/sound/createSoundId'
	],
	function(
		createFixedSoundFileSrc,
		createSoundId
	) {
		'use strict'


		var dummy = function() {}

		var isBackgroundMusic = function( src ) {
			return src == 'library/superkumba/sounds/KibaKumbaDschungel.mp3' ||
				src == 'library/superkumba/sounds/KibaKumbaWueste.mp3' ||
				src == 'library/superkumba/sounds/KibaKumbaHoehle.mp3' ||
				src == 'library/superkumba/sounds/KibaKumbaArktis.mp3'
		}

		// Unfortunately the game closure sound api is missing a "sound identity" concept. Therefore it is not possible to reference a playing sound by anything
		// but its src attribute value. The src value is not unqiue though.

		// HACK: This leaks memory because ids are never removed.
		var idToUrl = {}

		var audioBuffers = {}

		var AudioBuffer = function( src, onload, onerror ) {
			this.src     = src
			this.onload  = onload
			this.onerror = onerror
			this.loaded  = false
		}

		var isMutedValue = false

		var setAllMuted = function( isMute ) {
			isMutedValue = isMute

//			console.log( ' *** setAllMuted: ' + isMutedValue )

			for( var id in idToUrl ) {
				setVolume( id , isMutedValue ? 0.0 : 1.0 )
			}
		}

		var isAllMuted = function() {
			return isMutedValue
		}

		var setVolume = function( id, volume ) {
			var url = idToUrl[ id ]
			if( !url ) return

//			console.log( ' *** setVolume: ' + id + ' vol. ' + ( isMutedValue ? 0.0 : 1.0 ) )

			NATIVE.sound.setVolume( url, volume )
		}

		var stop = function ( id ) {
			var url = idToUrl[ id ]
			if( !url ) return

			delete idToUrl[ id ]

//			console.log( ' *** stop: ' + id )

			NATIVE.sound.stopSound( url )
		}

		var play = function( audioResource, id, volume, loop ) {
			volume = volume | 1.0

			var url = audioResource.src

			if( id ) {
				idToUrl[ id ] = url
			}

//			console.log( ' *** play: ' + url + ', ' + ( id ? id : 'anonymous' ) + ', vol: ' + ( isMutedValue ? 0.0 : volume ) )

			var play = isBackgroundMusic( url ) ?
				NATIVE.sound.playBackgroundMusic :
				NATIVE.sound.playSound

			play(
				url,
				isMutedValue ? 0.0 : volume,
				!!loop
			)
		}

		var createSound = function( audioBuffer ) {
//			console.log( ' *** Creating sound from buffer ' + audioBuffer.src )

			return {
				/*
				 * Public
				 */
				duration : 0, // not available

				/*
				 * Private
				 *
				 * This is an implementation detail of the class. If you write code that depends on this you better know what you are doing.
				 */
				src : audioBuffer.src
			}
		}


		var loadBuffer = function( src, onLoadCallback ) {
			if( !src ) {
				throw 'Error: No src provided.'
			}

			if( !onLoadCallback ) {
				throw 'Error: No onLoadCallback provided.'
			}

			var fixedSrc = createFixedSoundFileSrc( src )

			var audioBuffer = new AudioBuffer( fixedSrc, onLoadCallback )

			audioBuffers[ fixedSrc ] = audioBuffer

			if( isBackgroundMusic( fixedSrc ) ) {
				onLoadCallback( audioBuffer )

			} else {
				// trigger a load for this sound, this will trigger a sound loaded message in the future which will call the onLoadCallback
				NATIVE.sound.loadSound( fixedSrc )
			}
		}

		var createWrapperContext = function() {
			return {
				tick             : dummy,
				play             : play,
				setLoop          : dummy,
				setVolume        : setVolume,
				setAllMuted      : setAllMuted,
				isAllMuted       : isAllMuted,
				stop             : stop,
				mute             : dummy,
				createSound      : createSound,
				loadBuffer       : loadBuffer,
				getConfiguration : function() { return { type : 'native' } }
			}
		}

		/**
		 * Creates an audio context
		 *
		 * @return {Object}
		 */
		var createAudioContext = function() {
			// The "soundLoaded" event is only triggered when loading a sound and not when loading (a.k.a. streaming) background music.
			NATIVE.events.registerHandler(
				'soundLoaded',
				function( event ) {
//					console.log( ' *** soundLoaded: ' + event.url )

					var audioBuffer = audioBuffers[ event.url ]

					if( audioBuffer &&
						!audioBuffer.loaded ) {

						audioBuffer.loaded = true

						if( audioBuffer.onload ) {
							audioBuffer.onload( audioBuffer )
						}
					}
				}
			)

			NATIVE.events.registerHandler(
				'soundError',
				function( event ) {
//					console.log( ' *** error loading ' + event.url )

					var audioBuffer = audioBuffers[ event.url ]

					if( audioBuffer &&
						audioBuffer.onerror ) {

						audioBuffer.onerror( audioBuffer )
					}
				}
			)

			return createWrapperContext()
		}

		return createAudioContext
	}
)
