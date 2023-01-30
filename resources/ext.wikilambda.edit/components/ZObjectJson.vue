<template>
	<!--
		WikiLambda Vue component for the JSON rendering for ZObjects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-json">
		<wl-code-editor
			v-clickout="onClickoutHandler"
			mode="json"
			:value="initialJson"
			:read-only="readonly || viewmode"
			@change="codeChangeHandler"
		></wl-code-editor>
	</div>
</template>

<script>
var mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	typeUtils = require( '../mixins/typeUtils.js' ),
	schemata = require( '../mixins/schemata.js' ),
	CodeEditor = require( './base/CodeEditor.vue' );

// @vue/component
module.exports = exports = {
	name: 'wl-z-object-json',
	components: {
		'wl-code-editor': CodeEditor
	},
	directives: {
		clickout: {
			beforeMount: function ( el, binding ) {
				el.clickout = {
					stop: function ( e ) {
						e.stopPropagation();
					}
				};

				document.body.addEventListener( 'click', binding.value );
				el.addEventListener( 'click', el.clickout.stop );
			},
			unmounted: function ( el, binding ) {
				document.body.removeEventListener( 'click', binding.value );
				el.removeEventListener( 'click', el.clickout.stop );
			}
		}
	},
	mixins: [ typeUtils, schemata ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		zobjectId: {
			type: Number,
			required: false,
			default: 0
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
	methods: $.extend( {},
		mapActions( [
			'setIsZObjectDirty'
		] ),
		{
			codeChangeHandler: function ( val ) {
				this.codeEditorState = val;
				// this will ensure non-clickout events
				// (like clicking the submit button directly) still get processed the same way
				// however this will trigger a lot of false positives so there is probably a smarter way to do this
				// TODO (T301286): find  a more performant solution
				this.onClickoutHandler();
			},
			onClickoutHandler: function () {
				if ( this.readonly ) {
					return;
				}
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
				this.setIsZObjectDirty( true );
			}
		}
	),
	watch: {
		zobjectRaw: function () {
			this.codeEditorState = this.canonicalJson;
			this.initialJson = this.canonicalJson;
		}
	},
	mounted: function () {
		this.codeEditorState = this.canonicalJson;
		this.initialJson = this.canonicalJson;
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
