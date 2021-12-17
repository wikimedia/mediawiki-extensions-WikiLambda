<template>
	<div class="ext-wikilambda-json">
		<!-- TODO:T297767 - The custom directive v-clickout="onClickoutHandler" has been removed
		as it currently breaks with vue 3 migration. -->
		<code-editor
			mode="json"
			:value="initialJson"
			:read-only="readonly || viewmode"
			@change="codeChangeHandler"
		>
		</code-editor>
	</div>
</template>

<script>
var mapGetters = require( 'vuex' ).mapGetters,
	typeUtils = require( '../mixins/typeUtils.js' ),
	schemata = require( '../mixins/schemata.js' ),
	CodeEditor = require( './base/CodeEditor.vue' );

module.exports = {
	components: {
		'code-editor': CodeEditor
	},
	mixins: [ typeUtils, schemata ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		zobjectId: {
			type: Number
		},
		zobjectRaw: {
			type: [ Object, String ]
		},
		readonly: {
			type: Boolean,
			default: false
		}
	},
	data: function () {
		return {
			codeEditorState: '',
			initialJson: ''
		};
	},
	computed: $.extend( {},
		mapGetters( [ 'getZObjectAsJsonById', 'getZObjectById' ] ),
		{
			zobject: function () {
				return this.getZObjectById( this.zobjectId );
			},
			zobjectJson: function () {
				if ( this.zobjectRaw !== undefined ) {
					try {
						return typeof this.zobjectRaw === 'string' ?
							JSON.parse( this.zobjectRaw ) :
							this.zobjectRaw;
					} catch ( err ) {
						return this.zobjectRaw;
					}
				} else if ( this.zobject ) {
					return this.getZObjectAsJsonById( this.zobjectId, this.zobject.value === 'array' );
				}
				return '';
			},
			canonicalJson: function () {
				return JSON.stringify( this.canonicalizeZObject( this.zobjectJson ), null, 4 );
			}
		}
	),
	methods: {
		codeChangeHandler: function ( val ) {
			this.codeEditorState = val;
		},
		onClickoutHandler: function () {
			var json,
				self = this;
			if ( this.zobjectId !== undefined ) {
				try {
					json = JSON.parse( this.codeEditorState );
				} catch ( error ) {
					// JSON parse failed, do nothing
					return;
				}

				this.$store.dispatch( 'injectZObject', {
					zobject: json,
					key: this.zobject.key,
					id: this.zobjectId,
					parent: this.zobject.parent
				} ).then( function ( newType ) {
					if ( self.isValidZidFormat( newType ) ) {
						self.$emit( 'change-literal', newType );
					}
				} ).catch( function ( error ) {
					throw error;
				} );
			}
		}
	},
	watch: {
		zobjectRaw: function () {
			this.codeEditorState = this.canonicalJson;
			this.initialJson = this.canonicalJson;
		}
	},
	mounted: function () {
		this.codeEditorState = this.canonicalJson;
		this.initialJson = this.canonicalJson;
	},
	directives: {
		clickout: {
			bind: function ( el, binding ) {
				el.clickout = {
					stop: function ( e ) {
						e.stopPropagation();
					}
				};

				document.body.addEventListener( 'click', binding.value );
				el.addEventListener( 'click', el.clickout.stop );
			},
			unbind: function ( el, binding ) {
				document.body.removeEventListener( 'click', binding.value );
				el.removeEventListener( 'click', el.clickout.stop );
			}
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-json {
	white-space: pre-wrap;
	font-family: 'Courier New', 'Courier', monospace;
	width: 100%;
}
</style>
