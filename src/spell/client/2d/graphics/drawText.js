define(
	'spell/client/2d/graphics/drawText',
	[
		'spell/math/vec2'
	],
	function(
		vec2
	) {
		'use strict'


		var sourcePosition      = vec2.create(),
			destinationPosition = vec2.create(),
			dimensions          = vec2.create()

		/**
		 * Draws a character on a context.
		 *
		 * @param context
		 * @param texture
		 * @param charData
		 * @param dx
		 * @param dy
		 * @param spacing the actual spacing to be used
		 * @param fontMapHSpacing the fake horizontal spacing introduced by the font map
		 * @param fontMapVSpacing the fake vertical spacing introduced by the font map
		 */
		var drawCharacter = function( context, texture, charData, dx, dy, spacing, fontMapHSpacing, fontMapVSpacing ) {
			sourcePosition[ 0 ] = charData.x - fontMapHSpacing
			sourcePosition[ 1 ] = charData.y

			destinationPosition[ 0 ] = dx - fontMapHSpacing
			destinationPosition[ 1 ] = dy - fontMapVSpacing

			dimensions[ 0 ] = charData.width + fontMapHSpacing * 2
			dimensions[ 1 ] = charData.height + fontMapVSpacing * 2

			context.drawSubTexture(
				texture,
				sourcePosition,
				dimensions,
				destinationPosition,
				dimensions
			)

			return charData.width + spacing + fontMapHSpacing
		}

		var calculateAlignPosition = function( text, fontAsset, align, spacing ) {
			spacing = fontAsset.config.hSpacing + spacing
			if( !align ) return 0

			var width           = 0,
				numCharacters   = text.length,
				charset         = fontAsset.config.charset

			if( align === 'left' ) return width
			if( align === 'right' ) return width

			if( align === 'center' ){
				for( var i = 0; i < numCharacters; i++ ) {
					var charData = charset[ text.charAt( i ) ]

					// in case of unsupported character perform a fallback
					if( !charData ) {
						charData = charset[ ' ' ]
					}

					width += charData.width + spacing
				}

				return width * 0.5
			}
		}

		return function( context, fontAsset, fontTexture, dx, dy, text, spacing, align ) {
			spacing = spacing || 0
			text    = text.toString()
			dx      = dx - calculateAlignPosition( text, fontAsset, align, spacing )

			var numCharacters   = text.length,
				charset         = fontAsset.config.charset,
				fontMapHSpacing = fontAsset.config.hSpacing,
				fontMapVSpacing = fontAsset.config.vSpacing

			for( var i = 0; i < numCharacters; i++ ) {
				var charData = charset[ text.charAt( i ) ]

				// in case of unsupported character perform a fallback
				if( !charData ) {
					charData = charset[ ' ' ]
				}

				dx += drawCharacter( context, fontTexture, charData, dx, dy, spacing, fontMapHSpacing, fontMapVSpacing )
			}
		}
    }
)
