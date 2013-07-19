define(
	"spell/shared/util/platform/private/graphics/webgl/shaders",
	function() {
		return {
			vertex: [
				"attribute vec2 aVertexPosition;",

				"uniform mat3 uScreenSpaceShimMatrix;",
				"uniform mat3 uModelViewMatrix;",
				"uniform mat3 uTextureMatrix;",

				"varying vec2 vTextureCoord;",


				"void main( void ) {",
					"vTextureCoord = ( uTextureMatrix * vec3( aVertexPosition, 1.0 ) ).st;",
					"gl_Position = vec4( uScreenSpaceShimMatrix * uModelViewMatrix * vec3( aVertexPosition, 1.0 ), 1.0 );",
				"}"
			].join( "\n" ),

			fragment: [
				"precision mediump float;",

				"uniform sampler2D uTexture0;",
				"uniform vec4 uGlobalColor;",
				"uniform float uGlobalAlpha;",
				"uniform bool uFillRect;",

				"varying vec2 vTextureCoord;",


				"void main( void ) {",
					"if( !uFillRect ) {",
					"	vec4 color = texture2D( uTexture0, vTextureCoord );",
					"	gl_FragColor = color * vec4( 1.0, 1.0, 1.0, uGlobalAlpha );",

					"} else {",
					"	gl_FragColor = uGlobalColor * vec4( 1.0, 1.0, 1.0, uGlobalAlpha );",
					"}",
				"}"
			].join( "\n" )
		}
	}
)
